import { NextResponse } from "next/server";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { hashPassword, passwordProblem, sha256, rateLimited, clientIp } from "@/lib/accounts";
import { route, HttpError } from "@/lib/studio";

/** POST /api/account/reset { token, password } — finish a password reset. */
export const POST = route(async (req: Request) => {
  if (rateLimited("reset:" + clientIp(req), 20, 60 * 60_000)) throw new HttpError(429, "Too many tries. Try again later.");
  const b = await req.json().catch(() => ({}));
  const issue = passwordProblem(b.password);
  if (issue) throw new HttpError(400, issue);
  const hash = sha256(String(b.token ?? ""));
  const passwordHash = await hashPassword(String(b.password));
  await getDb().transaction(async tx => {
    // Claim the token atomically so it can only ever be used once.
    const [r] = await tx.update(schema.passwordResets).set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResets.tokenHash, hash), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())))
      .returning();
    if (!r) throw new HttpError(400, "This reset link has expired or was already used. Ask for a new one.");
    // New password + sign out every existing session (someone else may have been using the account).
    await tx.update(schema.users).set({ passwordHash, sessionVersion: sql`${schema.users.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(schema.users.id, r.userId));
  });
  return NextResponse.json({ ok: true });
});
