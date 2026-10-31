import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getDb, schema } from "@/lib/db";
import { getUserByEmail, isEmail, normalizeEmail, rateLimited, clientIp, sha256 } from "@/lib/accounts";
import { sendEmail, appUrl } from "@/lib/email";
import { route, HttpError } from "@/lib/studio";

/**
 * POST /api/account/forgot { email } — email a one-time reset link (valid 1 hour).
 * Always answers the same way, so it can't be used to find out who has an account.
 */
export const POST = route(async (req: Request) => {
  const b = await req.json().catch(() => ({}));
  const email = normalizeEmail(b.email);
  if (!isEmail(email)) throw new HttpError(400, "That email doesn't look right.");
  if (rateLimited("forgot:" + clientIp(req), 10, 60 * 60_000) || rateLimited("forgot:" + email, 3, 60 * 60_000)) {
    throw new HttpError(429, "Too many reset requests. Try again in an hour.");
  }
  const base = appUrl(req); // resolve config first so a misconfiguration fails the same way for every email
  const u = await getUserByEmail(email);
  if (u && u.role !== "deleted" && u.email) {
    const token = randomBytes(32).toString("base64url");
    await getDb().insert(schema.passwordResets).values({ tokenHash: sha256(token), userId: u.id, expiresAt: new Date(Date.now() + 60 * 60_000) });
    const link = `${base}/reset-password?token=${token}`;
    // Not awaited: waiting on the email service only for real accounts would reveal who has one.
    void sendEmail({
      to: u.email,
      subject: "Reset your Clip Farm password",
      text: `Someone asked to reset the password for your Clip Farm account.\n\nReset it here (this link works once, for 1 hour):\n${link}\n\nIf this wasn't you, ignore this email. Your password won't change.`,
    }).catch(e => console.error("[email]", e));
  }
  return NextResponse.json({ ok: true });
});
