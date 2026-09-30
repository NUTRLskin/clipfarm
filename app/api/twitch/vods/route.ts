import { NextResponse } from "next/server";
import { campaigns } from "@/lib/mockData";
import { getVod, listVods } from "@/lib/twitch";
import { requireUser, route, HttpError } from "@/lib/studio";

/**
 * GET /api/twitch/vods?login=<channel>   — past broadcasts for any Twitch channel
 * GET /api/twitch/vods?campaignId=<id>   — same, for a campaign's streamer (legacy)
 * GET /api/twitch/vods?id=<vodId>        — a single VOD (pasted URL)
 */
export const GET = route(async (req: Request) => {
  await requireUser();
  const q = new URL(req.url).searchParams;
  try {
    if (q.get("id")) {
      const v = await getVod(q.get("id")!);
      if (!v) throw new HttpError(404, "VOD not found — it may have been deleted or expired");
      return NextResponse.json({ vods: [v], twitchUser: v.userLogin });
    }
    let login = q.get("login")?.trim().toLowerCase();
    if (!login && q.get("campaignId")) {
      const c = campaigns.find(c => c.id === q.get("campaignId"));
      if (!c) throw new HttpError(404, "Campaign not found");
      login = c.twitchUser;
    }
    if (!login) throw new HttpError(400, "login is required");
    return NextResponse.json({ vods: await listVods(login), twitchUser: login });
  } catch (e: any) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(502, `Couldn't load VODs from Twitch: ${e.message}`);
  }
});
