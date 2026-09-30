import { NextResponse } from "next/server";
import { listThreads, openThread, sendMessage, threadView, unreadCount } from "@/lib/inbox";
import { getChannel } from "@/lib/twitch";
import { requireUser, route, HttpError } from "@/lib/studio";

/** GET /api/inbox — my threads (+ unread totals). */
export const GET = route(async () => {
  const me = await requireUser();
  return NextResponse.json({ threads: await listThreads(me), unread: await unreadCount(me) });
});

/** POST /api/inbox { streamerLogin, projectId?, body? } — clipper opens (or reuses) a thread with a streamer. */
export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const b = await req.json().catch(() => ({}));
  const login = String(b.streamerLogin || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,25}$/.test(login)) throw new HttpError(400, "Pick a streamer to message");
  const ch = await getChannel(login).catch(() => null);
  const t = await openThread(me, login, ch?.display || null, b.projectId ? String(b.projectId) : null);
  if (b.body) await sendMessage(t, me, String(b.body));
  return NextResponse.json(threadView(t, me), { status: 201 });
});
