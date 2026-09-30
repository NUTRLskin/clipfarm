import { NextResponse } from "next/server";
import { listVods } from "@/lib/twitch";
import { requireStreamer, route, HttpError } from "@/lib/studio";

/** GET /api/creator/vods — the signed-in streamer's own past broadcasts. */
export const GET = route(async () => {
  const me = await requireStreamer();
  try { return NextResponse.json({ twitchUser: me.twitchLogin, vods: await listVods(me.twitchLogin, 50) }); }
  catch (e: any) { throw new HttpError(502, `Couldn't load your VODs from Twitch: ${e.message}`); }
});
