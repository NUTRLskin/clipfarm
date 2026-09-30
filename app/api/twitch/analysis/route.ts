import { NextResponse } from "next/server";
import { analysisView, ensureAnalysis } from "@/lib/analysis";
import { requireUser, route, HttpError } from "@/lib/studio";

/** GET /api/twitch/analysis?vodId= — highlight analysis for a VOD (starts it if needed). Poll while processing. */
export const GET = route(async (req: Request) => {
  const user = await requireUser();
  const vodId = new URL(req.url).searchParams.get("vodId") || "";
  if (!/^\d{6,}$/.test(vodId)) throw new HttpError(400, "vodId is required");
  return NextResponse.json(analysisView(await ensureAnalysis(vodId, user.id)));
});
