import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { campaigns } from "@/lib/mockData";
import { getOwnedProject, projectState, requireUser, route, HttpError } from "@/lib/studio";
import { removeObject } from "@/lib/storage";
import { validateTimeline } from "@/lib/editor/validate";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const p = await getOwnedProject((await params).id, user.id);
  const c = campaigns.find(c => c.id === p.campaignId);
  return NextResponse.json({
    project: { id: p.id, title: p.title, campaignId: p.campaignId, timeline: p.timeline, exportAssetId: p.exportAssetId, updatedAt: p.updatedAt },
    campaign: c ? { id: c.id, streamer: c.streamer, twitchUser: c.twitchUser, status: c.status } : null,
    channel: p.twitchLogin ? { login: p.twitchLogin, display: p.twitchDisplay || p.twitchLogin, avatar: p.twitchAvatar } : null,
    ...(await projectState(p.id)),
  });
});

/** Autosave: timeline and/or title. */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const p = await getOwnedProject((await params).id, user.id);
  const body = await req.json();
  const patch: any = { updatedAt: new Date() };
  if (body.title != null) patch.title = String(body.title).slice(0, 120);
  if (body.timeline != null) {
    const tl = body.timeline;
    if (JSON.stringify(tl).length > 2_000_000) throw new HttpError(413, "Timeline too large");
    try { validateTimeline(tl); } catch (e: any) { throw new HttpError(400, e.message); }
    patch.timeline = tl;
  }
  await getDb().update(schema.projects).set(patch).where(eq(schema.projects.id, p.id));
  return NextResponse.json({ ok: true, updatedAt: patch.updatedAt });
});

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const p = await getOwnedProject((await params).id, user.id);
  const assets = await getDb().select().from(schema.assets).where(eq(schema.assets.projectId, p.id));
  await getDb().delete(schema.projects).where(eq(schema.projects.id, p.id));
  for (const a of assets) for (const k of [a.key, a.proxyKey, a.thumbsKey, a.waveKey]) if (k) removeObject(k).catch(() => {});
  return NextResponse.json({ ok: true });
});
