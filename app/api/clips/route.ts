import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { clipView, getContract } from "@/lib/contracts";
import { getUserById } from "@/lib/accounts";
import { requireCurrentTerms } from "@/lib/terms";
import { extractVideoId, getTikTokAccess, queryVideos } from "@/lib/tiktok";
import { requireClipper, requireUser, route, HttpError } from "@/lib/studio";

/**
 * GET /api/clips              — the signed-in clipper's own submissions
 * GET /api/clips?as=creator   — submissions to contracts the signed-in streamer owns
 */
export const GET = route(async (req: Request) => {
  const me = await requireUser();
  const db = getDb();
  if (new URL(req.url).searchParams.get("as") === "creator") {
    const rows = await db.select({ clip: schema.clips, rate: schema.contracts.rateCents }).from(schema.clips)
      .innerJoin(schema.contracts, eq(schema.clips.contractId, schema.contracts.id))
      .where(eq(schema.contracts.streamerUserId, me.id)).orderBy(desc(schema.clips.createdAt)).limit(1000);
    return NextResponse.json(rows.map(r => clipView(r.clip, r.rate)));
  }
  const rows = await db.select({ clip: schema.clips, rate: schema.contracts.rateCents }).from(schema.clips)
    .innerJoin(schema.contracts, eq(schema.clips.contractId, schema.contracts.id))
    .where(eq(schema.clips.clipperId, me.id)).orderBy(desc(schema.clips.createdAt)).limit(1000);
  return NextResponse.json(rows.map(r => clipView(r.clip, r.rate)));
});

/** Submit a posted TikTok to a contract. Body: { campaignId, url, title? } */
export const POST = route(async (req: Request) => {
  const me = await requireClipper();
  const body = await req.json().catch(() => ({}));
  const user = await getUserById(me.id);
  if (!user) throw new HttpError(401, "Sign in first");
  requireCurrentTerms(user);

  const contract = await getContract(String(body.campaignId || ""));
  if (!contract) throw new HttpError(404, "Contract not found");
  if (contract.status !== "open") throw new HttpError(400, "This contract isn't accepting clips");
  if (contract.streamerUserId === me.id) throw new HttpError(400, "You can't submit clips to your own contract");

  const rawUrl = String(body.url || "").trim();
  const videoId = await extractVideoId(rawUrl);
  if (!videoId) throw new HttpError(400, "Paste a TikTok video link (tiktok.com/@you/video/…)");

  let title = String(body.title || "").trim().slice(0, 150);
  let views = 0, coverUrl: string | null = null, url = rawUrl, viewsSyncedAt: Date | null = null;

  const tt = await getTikTokAccess(req);
  if (tt) {
    // TikTok only returns videos owned by this account — that's our ownership check.
    let found;
    try { [found] = await queryVideos(tt.accessToken, [videoId]); }
    catch { throw new HttpError(502, "Couldn't reach TikTok. Try again."); }
    if (!found) throw new HttpError(403, "That video isn't on the TikTok account you signed in with");
    title = title || found.title || found.video_description?.slice(0, 100) || "Untitled clip";
    views = found.view_count ?? 0;
    coverUrl = found.cover_image_url ?? null;
    url = found.share_url || url;
    viewsSyncedAt = new Date();
  } else {
    if (process.env.TIKTOK_CLIENT_KEY) throw new HttpError(403, "Connect your TikTok account to submit clips");
    // Without TikTok connected, the link's @handle must match the handle on the clipper's profile.
    if (!user.tiktokHandle) throw new HttpError(400, "Add your TikTok handle to your profile first (Settings).");
    const handle = rawUrl.match(/tiktok\.com\/@([^/?#]+)/i)?.[1];
    if (!handle) throw new HttpError(400, "Paste the full link that shows your @name (tiktok.com/@you/video/…), not a short link.");
    if (handle.toLowerCase() !== user.tiktokHandle.toLowerCase()) {
      throw new HttpError(403, `That video is from @${handle}, but your profile says @${user.tiktokHandle}.`);
    }
  }

  try {
    const [row] = await getDb().insert(schema.clips).values({
      contractId: contract.id, clipperId: me.id, clipperName: user.username ? `@${user.username}` : (user.name || "Clipper"),
      title: title || "Untitled clip", platform: "tiktok", url: url.slice(0, 500), tiktokVideoId: videoId,
      views, coverUrl, viewsSyncedAt, status: "pending",
    }).returning();
    return NextResponse.json(clipView(row, contract.rateCents), { status: 201 });
  } catch (e: any) {
    if (e?.code === "23505" || e?.cause?.code === "23505") throw new HttpError(409, "This video has already been submitted");
    throw e;
  }
});
