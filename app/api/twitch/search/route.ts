import { NextResponse } from "next/server";
import { getChannel, searchChannels } from "@/lib/twitch";
import { requireUser, route, HttpError } from "@/lib/studio";

/** GET /api/twitch/search?q=<name> — find any Twitch channel by name or login. */
export const GET = route(async (req: Request) => {
  await requireUser();
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 50);
  if (q.length < 2) return NextResponse.json({ channels: [] });
  try {
    const channels = await searchChannels(q);
    // If the search didn't surface an exact login match, try a direct lookup too.
    if (!channels.some(c => c.login === q.toLowerCase())) {
      const exact = await getChannel(q).catch(() => null);
      if (exact) channels.unshift(exact);
    }
    return NextResponse.json({ channels: channels.slice(0, 10) });
  } catch (e: any) {
    throw new HttpError(502, `Twitch search failed: ${e.message}`);
  }
});
