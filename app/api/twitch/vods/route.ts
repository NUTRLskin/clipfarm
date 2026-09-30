import { NextResponse } from "next/server";
import { campaigns } from "@/lib/mockData";
import { listVods } from "@/lib/twitch";
import { requireUser, route, HttpError } from "@/lib/studio";

export const GET = route(async (req: Request) => {
  await requireUser();
  const campaignId = new URL(req.url).searchParams.get("campaignId");
  const c = campaigns.find(c => c.id === campaignId);
  if (!c) throw new HttpError(404, "Campaign not found");
  try {
    return NextResponse.json({ vods: await listVods(c.twitchUser), twitchUser: c.twitchUser });
  } catch (e: any) {
    throw new HttpError(502, `Couldn't load VODs from Twitch: ${e.message}`);
  }
});
