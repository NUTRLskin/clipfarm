import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { clips, campaigns, type Clip } from "@/lib/mockData";
import { extractVideoId, getTikTokAccess, queryVideos } from "@/lib/tiktok";

export async function GET() { return NextResponse.json(clips); }

export async function POST(req: Request) {
  const session: any = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json();

  const campaign = campaigns.find(c => c.id === body.campaignId);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status !== "open") return NextResponse.json({ error: "Campaign isn't accepting clips" }, { status: 400 });

  const videoId = await extractVideoId(String(body.url || ""));
  if (!videoId) return NextResponse.json({ error: "Paste a TikTok video link (tiktok.com/@you/video/…)" }, { status: 400 });
  if (clips.some(c => c.tiktokVideoId === videoId)) {
    return NextResponse.json({ error: "This video has already been submitted" }, { status: 409 });
  }

  let title = String(body.title || "").trim();
  let views = 0, coverUrl: string | undefined, url = String(body.url).trim(), viewsSyncedAt: string | undefined;

  const tt = await getTikTokAccess(req);
  if (tt) {
    // TikTok only returns videos owned by this account — that's our ownership check.
    let found;
    try { [found] = await queryVideos(tt.accessToken, [videoId]); }
    catch (e: any) { return NextResponse.json({ error: "Couldn't reach TikTok. Try again." , detail: e.message }, { status: 502 }); }
    if (!found) return NextResponse.json({ error: "That video isn't on the TikTok account you signed in with" }, { status: 403 });
    title = title || found.title || found.video_description?.slice(0, 100) || "Untitled clip";
    views = found.view_count ?? 0;
    coverUrl = found.cover_image_url;
    url = found.share_url || url;
    viewsSyncedAt = new Date().toISOString();
  } else if (session.user.role === "clipper" && process.env.TIKTOK_CLIENT_KEY) {
    return NextResponse.json({ error: "Connect your TikTok account to submit clips" }, { status: 403 });
  }

  const c: Clip = {
    id: "cl" + Date.now(), campaignId: campaign.id, title: title || "Untitled clip", platform: "tiktok", url,
    views, earned: 0, status: "pending",
    submittedBy: session.user.name ?? "Clipper", submittedById: session.user.id,
    date: new Date().toISOString().slice(0, 10), tiktokVideoId: videoId, coverUrl, viewsSyncedAt,
  };
  clips.push(c);
  return NextResponse.json(c, { status: 201 });
}
