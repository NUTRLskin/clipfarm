import { getDb, schema } from "./db";
import type { Project } from "./db/schema";
import { enqueue } from "./jobs";
import { campaigns } from "./mockData";
import { listVods } from "./twitch";
import { HttpError, MAX_IMPORT_SECONDS } from "./studio";
import { fmtTime } from "./editor/timeline";

/** Validate a VOD range against the campaign's streamer and queue the download. */
export async function importVodRange(p: Project, vod: { vodId: string; start: number; end: number }) {
  const c = campaigns.find(c => c.id === p.campaignId);
  if (!c) throw new HttpError(404, "Campaign not found");
  const start = Math.max(0, Number(vod.start)), end = Number(vod.end);
  if (!(end > start)) throw new HttpError(400, "Pick an end point after the start point");
  if (end - start > MAX_IMPORT_SECONDS) throw new HttpError(400, `Imports are limited to ${Math.round(MAX_IMPORT_SECONDS / 60)} minutes`);
  if (end - start < 1) throw new HttpError(400, "Pick at least 1 second");
  // Only VODs from this campaign's streamer can be pulled.
  const vods = await listVods(c.twitchUser);
  const v = vods.find(v => v.id === String(vod.vodId));
  if (!v) throw new HttpError(403, "That VOD doesn't belong to this campaign's streamer");
  if (v.duration && end > v.duration + 1) throw new HttpError(400, "Range goes past the end of the VOD");
  const [a] = await getDb().insert(schema.assets).values({
    projectId: p.id, kind: "vod", name: `${v.title.slice(0, 60)} · ${fmtTime(start)}–${fmtTime(end)}`,
    meta: { vodId: v.id, vodUrl: v.url, start, end },
  }).returning();
  await enqueue(p.id, "ingest", { assetId: a.id, vodUrl: v.url, start, end });
  return a;
}

