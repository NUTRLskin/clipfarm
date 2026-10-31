import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { route } from "@/lib/studio";
import { requireStaff } from "@/lib/admin/session";

/** GET /api/admin/clips?status=pending|paid|rejected — every clip, newest first. */
export const GET = route(async (req: Request) => {
  await requireStaff("clips");
  const status = new URL(req.url).searchParams.get("status");
  const c = schema.clips, k = schema.contracts;
  const rows = await getDb().select({ clip: c, streamer: k.streamerName, rate: k.rateCents }).from(c)
    .innerJoin(k, eq(c.contractId, k.id))
    .where(status && ["pending", "paid", "rejected"].includes(status) ? eq(c.status, status) : undefined)
    .orderBy(desc(c.createdAt)).limit(300);
  return NextResponse.json(rows.map(({ clip, streamer, rate }) => ({
    id: clip.id, title: clip.title, url: clip.url, clipper: clip.clipperName, clipperId: clip.clipperId, streamer, contractId: clip.contractId,
    status: clip.status, views: clip.views, earned: clip.earnedCents / 100, fee: clip.feeCents / 100, rate: rate / 100,
    viewsSyncedAt: clip.viewsSyncedAt, createdAt: clip.createdAt, reviewedAt: clip.reviewedAt,
  })));
});
