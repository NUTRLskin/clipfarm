import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { campaigns } from "@/lib/mockData";
import { emptyTimeline } from "@/lib/editor/presets";
import { requireUser, route, HttpError } from "@/lib/studio";
import { importVodRange } from "@/lib/importVod";

export const GET = route(async () => {
  const user = await requireUser();
  const rows = await getDb().select({
    id: schema.projects.id, title: schema.projects.title, campaignId: schema.projects.campaignId,
    updatedAt: schema.projects.updatedAt, exportAssetId: schema.projects.exportAssetId,
  }).from(schema.projects).where(eq(schema.projects.ownerId, user.id)).orderBy(desc(schema.projects.updatedAt)).limit(100);
  return NextResponse.json(rows.map(r => ({ ...r, streamer: campaigns.find(c => c.id === r.campaignId)?.streamer ?? "" })));
});

/** Create a project, optionally importing a VOD range straight away. */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const c = campaigns.find(c => c.id === body.campaignId);
  if (!c) throw new HttpError(404, "Campaign not found");
  if (c.status !== "open") throw new HttpError(400, "This campaign isn't accepting clips");
  const [p] = await getDb().insert(schema.projects).values({
    ownerId: user.id, ownerName: user.name ?? null, campaignId: c.id,
    title: String(body.title || `${c.streamer} clip`).slice(0, 120), timeline: emptyTimeline(),
  }).returning();
  if (body.vod) await importVodRange(p, body.vod);
  return NextResponse.json({ id: p.id }, { status: 201 });
});
