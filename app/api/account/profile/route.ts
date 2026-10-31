import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getUserById, publicProfile, profileComplete, cleanHandle, HANDLE_RE, USERNAME_RE, usernameTaken } from "@/lib/accounts";
import { requireUser, route, HttpError } from "@/lib/studio";
import { termsCurrent } from "@/lib/terms";

async function me() {
  const s = await requireUser();
  const u = await getUserById(s.id);
  if (!u || u.role === "deleted") throw new HttpError(401, "Sign in first");
  return u;
}

/** GET /api/account/profile — the signed-in person's profile. */
export const GET = route(async () => {
  const u = await me();
  return NextResponse.json({ ...publicProfile(u), complete: profileComplete(u), termsCurrent: termsCurrent(u) });
});

/** PATCH /api/account/profile — update any of: name, username, bio, tiktokHandle, instagramHandle, youtubeHandle, country. */
export const PATCH = route(async (req: Request) => {
  const u = await me();
  const b = await req.json().catch(() => ({}));
  const patch: Partial<typeof schema.users.$inferInsert> = {};

  if ("name" in b) {
    const name = String(b.name ?? "").trim().slice(0, 60);
    if (!name) throw new HttpError(400, "Name can't be empty.");
    patch.name = name;
  }
  if ("username" in b) {
    const username = String(b.username ?? "").trim().replace(/^@/, "").toLowerCase();
    if (!USERNAME_RE.test(username)) throw new HttpError(400, "Username: 3–24 letters, numbers or underscores.");
    if (await usernameTaken(username, u.id)) throw new HttpError(409, "That username is taken.");
    patch.username = username;
  }
  if ("bio" in b) patch.bio = String(b.bio ?? "").trim().slice(0, 280) || null;
  for (const key of ["tiktokHandle", "instagramHandle", "youtubeHandle"] as const) {
    if (!(key in b)) continue;
    const h = cleanHandle(b[key]);
    if (h && !HANDLE_RE.test(h)) throw new HttpError(400, "Handles can only use letters, numbers, dots, dashes and underscores.");
    patch[key] = h;
  }
  if ("country" in b) patch.country = String(b.country ?? "").trim().slice(0, 2).toUpperCase() || null;

  if (Object.keys(patch).length === 0) throw new HttpError(400, "Nothing to update.");
  try {
    const [row] = await getDb().update(schema.users).set({ ...patch, updatedAt: new Date() }).where(eq(schema.users.id, u.id)).returning();
    return NextResponse.json({ ...publicProfile(row), complete: profileComplete(row) });
  } catch (e: any) {
    if (e?.code === "23505" || e?.cause?.code === "23505") throw new HttpError(409, "That username is taken.");
    throw e;
  }
});

/**
 * DELETE /api/account/profile — delete my account. Personal details are wiped right away and
 * sign-in stops working; clip and payout records stay (anonymized) for tax and fraud rules.
 */
export const DELETE = route(async (req: Request) => {
  const u = await me();
  const b = await req.json().catch(() => ({}));
  if (b.confirm !== "DELETE") throw new HttpError(400, "Type DELETE to confirm.");
  const now = new Date();
  await getDb().transaction(async tx => {
    await tx.delete(schema.passwordResets).where(eq(schema.passwordResets.userId, u.id));
    await tx.update(schema.users).set({
      role: "deleted", email: null, passwordHash: null, name: "Deleted user", username: null, bio: null,
      tiktokHandle: null, instagramHandle: null, youtubeHandle: null, country: null, avatarUrl: null,
      twitchId: null, twitchLogin: null, tiktokOpenId: null, updatedAt: now,
    }).where(eq(schema.users.id, u.id));
    await tx.update(schema.clips).set({ clipperName: "Deleted user", updatedAt: now }).where(eq(schema.clips.clipperId, u.id));
    // A deleted streamer can't review clips, so their contracts stop taking new ones.
    await tx.update(schema.contracts).set({ status: "closed", streamerName: "Deleted user", updatedAt: now }).where(eq(schema.contracts.streamerUserId, u.id));
    await tx.update(schema.projects).set({ ownerName: null }).where(eq(schema.projects.ownerId, u.id));
    await tx.update(schema.threads).set({ clipperName: "Deleted user" }).where(eq(schema.threads.clipperId, u.id));
    await tx.update(schema.messages).set({ senderName: "Deleted user" }).where(eq(schema.messages.senderId, u.id));
  });
  return NextResponse.json({ ok: true });
});
