import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getContract } from "@/lib/contracts";
import { emptyTimeline } from "@/lib/editor/presets";
import { getChannel } from "@/lib/twitch";
import { requireUser, route, HttpError } from "@/lib/studio";
import { importVodRange } from "@/lib/importVod";

export const GET = route(async () => {
  const user = await requireUser();
  const rows = await getDb().select({
    id: schema.projects.id, title: schema.projects.title, campaignId: schema.projects.campaignId,
    twitchLogin: schema.projects.twitchLogin, twitchDisplay: schema.projects.twitchDisplay, twitchAvatar: schema.projects.twitchAvatar,
    updatedAt: schema.projects.updatedAt, exportAssetId: schema.projects.exportAssetId,
  }).from(schema.projects).where(eq(schema.projects.ownerId, user.id)).orderBy(desc(schema.projects.updatedAt)).limit(100);
  const ids = [...new Set(rows.map(r => r.campaignId).filter(Boolean))] as string[];
  const names = new Map((ids.length ? await getDb().select({ id: schema.contracts.id, name: schema.contracts.streamerName }).from(schema.contracts).where(inArray(schema.contracts.id, ids)) : []).map(c => [c.id, c.name]));
  return NextResponse.json(rows.map(r => ({
    ...r,
    streamer: r.twitchDisplay || (r.campaignId && names.get(r.campaignId)) || "",
    campaign: (r.campaignId && names.get(r.campaignId)) || null,
  })));
});

/**
 * Create a project. Any of:
 *   { campaignId }                 — clip for a ClipFarm campaign (footage restricted to that streamer)
 *   { twitchLogin }                — clip from any Twitch channel
 *   { vod: {vodId,start,end} }     — plus an immediate import; channel is taken from the VOD
 *   {}                             — empty project for uploaded footage
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  let campaignId: string | null = null, twitchLogin: string | null = null, twitchDisplay: string | null = null, twitchAvatar: string | null = null;

  if (body.campaignId) {
    const c = await getContract(String(body.campaignId));
    if (!c) throw new HttpError(404, "Contract not found");
    if (c.status !== "open") throw new HttpError(400, "This contract isn't accepting clips");
    campaignId = c.id; twitchLogin = c.twitchLogin; twitchDisplay = c.streamerName;
  } else if (body.twitchLogin) {
    let ch;
    try { ch = await getChannel(String(body.twitchLogin)); }
    catch (e: any) { throw new HttpError(502, `Couldn't reach Twitch: ${e.message}`); }
    if (!ch) throw new HttpError(404, "Twitch channel not found");
    twitchLogin = ch.login; twitchDisplay = ch.display; twitchAvatar = ch.avatar;
  }

  const [p] = await getDb().insert(schema.projects).values({
    ownerId: user.id, ownerName: user.name ?? null, campaignId, twitchLogin, twitchDisplay, twitchAvatar,
    title: String(body.title || (twitchDisplay ? `${twitchDisplay} clip` : "Untitled clip")).slice(0, 120), timeline: emptyTimeline(),
  }).returning();
  if (body.vod) await importVodRange(p, body.vod);
  return NextResponse.json({ id: p.id }, { status: 201 });
});
