import { NextResponse } from "next/server";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { clipView } from "@/lib/contracts";
import { getTikTokAccess, queryVideos } from "@/lib/tiktok";
import { requireUser, route, HttpError } from "@/lib/studio";
import { SITE } from "@/lib/site";

/** Refresh live TikTok view counts for the signed-in clipper's submissions. */
export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const tt = await getTikTokAccess(req);
  if (!tt) throw new HttpError(400, "TikTok not connected");

  const db = getDb();
  const mine = await db.select().from(schema.clips)
    .where(and(eq(schema.clips.clipperId, me.id), isNotNull(schema.clips.tiktokVideoId), ne(schema.clips.status, "rejected")));
  if (mine.length === 0) return NextResponse.json({ updated: 0, clips: [] });

  let videos;
  try { videos = await queryVideos(tt.accessToken, mine.map(c => c.tiktokVideoId!)); }
  catch { throw new HttpError(502, "Couldn't reach TikTok"); }

  const byId = new Map(videos.map(v => [v.id, v]));
  const now = new Date();
  const out = [];
  for (const c of mine) {
    const v = byId.get(c.tiktokVideoId!);
    if (!v || typeof v.view_count !== "number") { out.push(c); continue; }
    // Views only count for the first 30 days (SITE.viewWindowDays) after the clip was submitted.
    if (now.getTime() - c.createdAt.getTime() > SITE.viewWindowDays * 86_400_000) { out.push(c); continue; }
    // Paid clips keep the views they were paid on; the live count is only tracked for pending ones.
    // The CASE re-checks status at write time, so an approval that lands mid-sync keeps its paid views.
    const [row] = await db.update(schema.clips).set({
      views: sql`case when ${schema.clips.status} = 'pending' then ${Math.min(v.view_count, 2_000_000_000)} else ${schema.clips.views} end`,
      coverUrl: v.cover_image_url ?? c.coverUrl, viewsSyncedAt: now, updatedAt: now,
    }).where(eq(schema.clips.id, c.id)).returning();
    out.push(row);
  }
  return NextResponse.json({ updated: out.filter(c => c.viewsSyncedAt?.getTime() === now.getTime()).length, clips: out.map(clipView) });
});
