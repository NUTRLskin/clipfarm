import { NextResponse } from "next/server";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { clipView } from "@/lib/contracts";
import { requireStreamer, route } from "@/lib/studio";

/**
 * GET /api/creator/clippers — everyone who has pulled footage from my channel in Studio, with
 * their activity, plus clips they've submitted to my campaigns. Also returns which of my VODs
 * are being clipped most.
 */
export const GET = route(async () => {
  const me = await requireStreamer();
  const db = getDb();
  const myCampaignIds = (await db.select({ id: schema.contracts.id }).from(schema.contracts).where(eq(schema.contracts.streamerUserId, me.id))).map(c => c.id);
  const clips = myCampaignIds.length ? (await db.select().from(schema.clips).where(inArray(schema.clips.contractId, myCampaignIds))).map(clipView) : [];
  const projects = await db.select().from(schema.projects)
    .where(myCampaignIds.length ? sql`${schema.projects.twitchLogin} = ${me.twitchLogin} or ${schema.projects.campaignId} in ${myCampaignIds}` : eq(schema.projects.twitchLogin, me.twitchLogin))
    .orderBy(desc(schema.projects.updatedAt)).limit(1000);
  const ids = projects.map(p => p.id);
  const assets = ids.length ? await db.select({ projectId: schema.assets.projectId, kind: schema.assets.kind, status: schema.assets.status, meta: schema.assets.meta, name: schema.assets.name, createdAt: schema.assets.createdAt })
    .from(schema.assets).where(inArray(schema.assets.projectId, ids)) : [];

  const byClipper = new Map<string, any>();
  for (const p of projects) {
    const c = byClipper.get(p.ownerId) || { id: p.ownerId, name: p.ownerName || "Clipper", projects: 0, imports: 0, exports: 0, lastActive: p.updatedAt, submitted: 0, views: 0, earned: 0, latest: [] as any[] };
    c.projects++;
    if (p.updatedAt > c.lastActive) c.lastActive = p.updatedAt;
    if (c.latest.length < 3) c.latest.push({ id: p.id, title: p.title, updatedAt: p.updatedAt, exported: !!p.exportAssetId });
    byClipper.set(p.ownerId, c);
  }
  const vodHeat = new Map<string, { vodId: string; imports: number; clippers: Set<string>; last: Date }>();
  for (const a of assets) {
    const owner = projects.find(p => p.id === a.projectId)?.ownerId; if (!owner) continue;
    const c = byClipper.get(owner);
    if (a.kind === "vod") { c.imports++; const m: any = a.meta || {}; if (m.vodId) { const h = vodHeat.get(m.vodId) || { vodId: m.vodId, imports: 0, clippers: new Set<string>(), last: a.createdAt }; h.imports++; h.clippers.add(owner); if (a.createdAt > h.last) h.last = a.createdAt; vodHeat.set(m.vodId, h); } }
    if (a.kind === "export" && a.status === "ready") c.exports++;
  }
  for (const clip of clips) {
    if (!myCampaignIds.includes(clip.campaignId)) continue;
    const c = byClipper.get(clip.submittedById) || { id: clip.submittedById, name: clip.submittedBy, projects: 0, imports: 0, exports: 0, lastActive: new Date(clip.date), submitted: 0, views: 0, earned: 0, latest: [] };
    c.submitted++; c.views += clip.views; c.earned += clip.earned;
    byClipper.set(clip.submittedById, c);
  }
  const list = [...byClipper.values()].sort((a, b) => +new Date(b.lastActive) - +new Date(a.lastActive));
  const totals = { clippers: list.length, projects: projects.length, exports: list.reduce((s, c) => s + c.exports, 0), submitted: list.reduce((s, c) => s + c.submitted, 0), views: list.reduce((s, c) => s + c.views, 0) };
  return NextResponse.json({ clippers: list, totals, vods: [...vodHeat.values()].map(h => ({ vodId: h.vodId, imports: h.imports, clippers: h.clippers.size, last: h.last })).sort((a, b) => b.imports - a.imports) });
});
