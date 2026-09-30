import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { Project } from "./db/schema";
import { enqueue } from "./jobs";
import { campaigns } from "./mockData";
import { getVod } from "./twitch";
import { HttpError, MAX_IMPORT_SECONDS } from "./studio";
import { fmtTime } from "./editor/timeline";

/**
 * Validate a VOD range and queue the download. The VOD is looked up on Twitch by id, so a
 * clipper can pull from any streamer's kept broadcasts. If the project belongs to a campaign,
 * the VOD must be that campaign's streamer's; otherwise the project adopts the VOD's channel.
 */
export async function importVodRange(p: Project, vod: { vodId: string; start: number; end: number }) {
  const start = Math.max(0, Number(vod.start)), end = Number(vod.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new HttpError(400, "Invalid range");
  if (!(end > start)) throw new HttpError(400, "Pick an end point after the start point");
  if (end - start > MAX_IMPORT_SECONDS) throw new HttpError(400, `Imports are limited to ${Math.round(MAX_IMPORT_SECONDS / 60)} minutes`);
  if (end - start < 1) throw new HttpError(400, "Pick at least 1 second");

  let v;
  try { v = await getVod(String(vod.vodId)); }
  catch (e: any) { throw new HttpError(502, `Couldn't reach Twitch: ${e.message}`); }
  if (!v) throw new HttpError(404, "VOD not found — it may have been deleted or expired");
  if (v.duration && end > v.duration + 1) throw new HttpError(400, "Range goes past the end of the VOD");

  const owner = (v.userLogin || "").toLowerCase();
  if (p.campaignId) {
    const c = campaigns.find(c => c.id === p.campaignId);
    if (c && owner && owner !== c.twitchUser) throw new HttpError(403, `Clips for the ${c.streamer} campaign must come from twitch.tv/${c.twitchUser}`);
  } else if (p.twitchLogin && owner && owner !== p.twitchLogin) {
    throw new HttpError(400, `This project is for twitch.tv/${p.twitchLogin} — start a new clip to use another streamer's VOD`);
  }
  if (!p.twitchLogin && owner) {
    await getDb().update(schema.projects).set({ twitchLogin: owner, twitchDisplay: v.userName || owner, updatedAt: new Date() }).where(eq(schema.projects.id, p.id));
  }

  const [a] = await getDb().insert(schema.assets).values({
    projectId: p.id, kind: "vod", name: `${v.title.slice(0, 60)} · ${fmtTime(start)}–${fmtTime(end)}`,
    meta: { vodId: v.id, vodUrl: v.url, start, end, channel: owner },
  }).returning();
  await enqueue(p.id, "ingest", { assetId: a.id, vodUrl: v.url, start, end });
  return a;
}
