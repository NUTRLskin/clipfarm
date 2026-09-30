import { NextResponse } from "next/server";
import { getThread, listMessages, markRead, sendMessage, messageView, threadView } from "@/lib/inbox";
import { requireUser, route } from "@/lib/studio";

type Ctx = { params: Promise<{ threadId: string }> };

/** GET /api/inbox/[id]?after=<iso> — messages (optionally only new ones); marks the thread read for me. */
export const GET = route(async (req: Request, { params }: Ctx) => {
  const me = await requireUser();
  const t = await getThread((await params).threadId, me);
  const after = new URL(req.url).searchParams.get("after") || undefined;
  const msgs = await listMessages(t, me, after);
  await markRead(t, me);
  return NextResponse.json({ thread: threadView(t, me), messages: msgs });
});

/** POST /api/inbox/[id] { body } — reply. */
export const POST = route(async (req: Request, { params }: Ctx) => {
  const me = await requireUser();
  const t = await getThread((await params).threadId, me);
  const { body } = await req.json();
  const m = await sendMessage(t, me, String(body || ""));
  return NextResponse.json(messageView(m, me), { status: 201 });
});
