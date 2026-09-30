import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { campaigns } from "@/lib/mockData";
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
  return NextResponse.json(rows.map(r => ({
    ...r,
    streamer: r.twitchDisplay || campaigns.find(c => c.id === r.campaignId)?.streamer || "",
    campaign: campaigns.find(c => c.id === r.campaignId)?.streamer || null,
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
    const c = campaigns.find(c => c.id === body.campaignId);
    if (!c) throw new HttpError(404, "Campaign not found");
    if (c.status !== "open") throw new HttpError(400, "This campaign isn't accepting clips");
    campaignId = c.id; twitchLogin = c.twitchUser; twitchDisplay = c.streamer;
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
