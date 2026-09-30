import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { clips } from "@/lib/mockData";
import { getTikTokAccess, queryVideos } from "@/lib/tiktok";

/** Refresh live TikTok view counts for the signed-in clipper's submissions. */
export async function POST(req: Request) {
  const session: any = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const tt = await getTikTokAccess(req);
  if (!tt) return NextResponse.json({ error: "TikTok not connected" }, { status: 400 });

  const mine = clips.filter(c => c.submittedById === session.user.id && c.tiktokVideoId && c.status !== "rejected");
  if (mine.length === 0) return NextResponse.json({ updated: 0, clips: [] });

  let videos;
  try { videos = await queryVideos(tt.accessToken, mine.map(c => c.tiktokVideoId!)); }
  catch (e: any) { return NextResponse.json({ error: "Couldn't reach TikTok", detail: e.message }, { status: 502 }); }

  const byId = new Map(videos.map(v => [v.id, v]));
  const now = new Date().toISOString();
  let updated = 0;
  for (const c of mine) {
    const v = byId.get(c.tiktokVideoId!);
    if (!v || typeof v.view_count !== "number") continue;
    c.views = v.view_count;
    c.coverUrl = v.cover_image_url ?? c.coverUrl;
    c.viewsSyncedAt = now;
    updated++;
  }
  return NextResponse.json({ updated, clips: mine });
}
