import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { ThreadRow, MessageRow } from "./db/schema";
import { HttpError, type SessionUser } from "./studio";

export type ThreadView = {
  id: string; streamerLogin: string; streamerDisplay: string; clipperId: string; clipperName: string;
  projectId: string | null; lastMessageAt: string; lastPreview: string | null; unread: number;
  /** Who the other side is, from the viewer's perspective. */
  with: { name: string; login?: string; role: "creator" | "clipper" };
};
export type MessageView = { id: string; body: string; senderRole: string; senderName: string | null; mine: boolean; createdAt: string };

export function threadView(t: ThreadRow, me: SessionUser): ThreadView {
  const iAmStreamer = !!me.twitchLogin && t.streamerLogin === me.twitchLogin;
  return {
    id: t.id, streamerLogin: t.streamerLogin, streamerDisplay: t.streamerDisplay || t.streamerLogin, clipperId: t.clipperId, clipperName: t.clipperName || "Clipper",
    projectId: t.projectId, lastMessageAt: t.lastMessageAt.toISOString(), lastPreview: t.lastPreview,
    unread: iAmStreamer ? t.unreadForStreamer : t.unreadForClipper,
    with: iAmStreamer ? { name: t.clipperName || "Clipper", role: "clipper" } : { name: t.streamerDisplay || t.streamerLogin, login: t.streamerLogin, role: "creator" },
  };
}
export const messageView = (m: MessageRow, me: SessionUser): MessageView =>
  ({ id: m.id, body: m.body, senderRole: m.senderRole, senderName: m.senderName, mine: m.senderId === me.id, createdAt: m.createdAt.toISOString() });

/** All threads the viewer is part of — as the clipper, and (if signed in with Twitch) as the streamer. */
export async function listThreads(me: SessionUser) {
  const db = getDb();
  const where = me.twitchLogin
    ? sql`${schema.threads.clipperId} = ${me.id} or ${schema.threads.streamerLogin} = ${me.twitchLogin}`
    : eq(schema.threads.clipperId, me.id);
  const rows = await db.select().from(schema.threads).where(where).orderBy(desc(schema.threads.lastMessageAt)).limit(200);
  // First time this streamer shows up, claim their threads so the UI can show "seen" state later.
  if (me.twitchLogin && rows.some(r => r.streamerLogin === me.twitchLogin && !r.streamerUserId))
    await db.update(schema.threads).set({ streamerUserId: me.id }).where(and(eq(schema.threads.streamerLogin, me.twitchLogin), sql`${schema.threads.streamerUserId} is null`));
  return rows.map(r => threadView(r, me));
}

export async function getThread(id: string, me: SessionUser): Promise<ThreadRow> {
  const [t] = await getDb().select().from(schema.threads).where(eq(schema.threads.id, id));
  if (!t) throw new HttpError(404, "Conversation not found");
  const mine = t.clipperId === me.id || (!!me.twitchLogin && t.streamerLogin === me.twitchLogin);
  if (!mine) throw new HttpError(404, "Conversation not found");
  return t;
}

/** Find or create the clipper↔streamer thread. Only clippers open threads; streamers reply. */
export async function openThread(me: SessionUser, streamerLogin: string, streamerDisplay: string | null, projectId: string | null) {
  const login = streamerLogin.toLowerCase();
  if (me.twitchLogin === login) throw new HttpError(400, "That's your own channel");
  const db = getDb();
  const [existing] = await db.select().from(schema.threads).where(and(eq(schema.threads.streamerLogin, login), eq(schema.threads.clipperId, me.id)));
  if (existing) {
    if (projectId && !existing.projectId) await db.update(schema.threads).set({ projectId }).where(eq(schema.threads.id, existing.id));
    return existing;
  }
  const [t] = await db.insert(schema.threads).values({ streamerLogin: login, streamerDisplay, clipperId: me.id, clipperName: me.name || "Clipper", projectId }).onConflictDoNothing().returning();
  if (t) return t;
  const [again] = await db.select().from(schema.threads).where(and(eq(schema.threads.streamerLogin, login), eq(schema.threads.clipperId, me.id)));
  return again;
}

export async function sendMessage(t: ThreadRow, me: SessionUser, body: string) {
  const text = body.trim().slice(0, 4000);
  if (!text) throw new HttpError(400, "Message is empty");
  const asStreamer = !!me.twitchLogin && t.streamerLogin === me.twitchLogin;
  const db = getDb();
  const [m] = await db.insert(schema.messages).values({ threadId: t.id, senderId: me.id, senderRole: asStreamer ? "creator" : "clipper", senderName: me.name || null, body: text }).returning();
  await db.update(schema.threads).set({
    lastMessageAt: m.createdAt, lastPreview: text.slice(0, 140),
    ...(asStreamer ? { unreadForClipper: sql`${schema.threads.unreadForClipper} + 1`, streamerUserId: me.id, streamerDisplay: t.streamerDisplay || me.name || null }
                   : { unreadForStreamer: sql`${schema.threads.unreadForStreamer} + 1` }),
  }).where(eq(schema.threads.id, t.id));
  return m;
}

export async function markRead(t: ThreadRow, me: SessionUser) {
  const asStreamer = !!me.twitchLogin && t.streamerLogin === me.twitchLogin;
  await getDb().update(schema.threads).set(asStreamer ? { unreadForStreamer: 0 } : { unreadForClipper: 0 }).where(eq(schema.threads.id, t.id));
}

export async function listMessages(t: ThreadRow, me: SessionUser, after?: string) {
  const rows = await getDb().select().from(schema.messages)
    .where(after ? and(eq(schema.messages.threadId, t.id), gt(schema.messages.createdAt, new Date(after))) : eq(schema.messages.threadId, t.id))
    .orderBy(schema.messages.createdAt).limit(500);
  return rows.map(m => messageView(m, me));
}

export async function unreadCount(me: SessionUser) {
  const db = getDb();
  const [c] = await db.select({ n: sql<number>`coalesce(sum(${schema.threads.unreadForClipper}),0)` }).from(schema.threads).where(eq(schema.threads.clipperId, me.id));
  let s = 0;
  if (me.twitchLogin) {
    const [r] = await db.select({ n: sql<number>`coalesce(sum(${schema.threads.unreadForStreamer}),0)` }).from(schema.threads).where(eq(schema.threads.streamerLogin, me.twitchLogin));
    s = Number(r?.n || 0);
  }
  return { clipper: Number(c?.n || 0), streamer: s };
}
