import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getUserById, hashPassword, passwordProblem, verifyPassword, rateLimited, bumpSessionVersion } from "@/lib/accounts";
import { requireUser, route, HttpError } from "@/lib/studio";

/** POST /api/account/password { current?, next } — change (or, for Twitch/TikTok-only accounts, set) a password. */
export const POST = route(async (req: Request) => {
  const s = await requireUser();
  if (rateLimited("pwchange:" + s.id, 10, 15 * 60_000)) throw new HttpError(429, "Too many tries. Wait 15 minutes.");
  const u = await getUserById(s.id);
  if (!u || u.role === "deleted") throw new HttpError(401, "Sign in first");
  const b = await req.json().catch(() => ({}));
  if (u.passwordHash && !(await verifyPassword(String(b.current ?? ""), u.passwordHash))) throw new HttpError(403, "Your current password isn't right.");
  if (!u.email) throw new HttpError(400, "Add an email to your account before setting a password.");
  const issue = passwordProblem(b.next);
  if (issue) throw new HttpError(400, issue);
  await getDb().update(schema.users).set({ passwordHash: await hashPassword(String(b.next)), updatedAt: new Date() }).where(eq(schema.users.id, u.id));
  // Sign out every other browser. The settings page signs this one back in with the new password.
  await bumpSessionVersion(u.id);
  return NextResponse.json({ ok: true });
});
