import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb, schema } from "@/lib/db";
import { hashPassword, verifyPassword, verifyAgainstDummy, normalizeEmail, isEmail, passwordProblem, rateLimited, clientIp, sha256 } from "@/lib/accounts";
import { route, HttpError } from "@/lib/studio";
import {
  ADMIN_COOKIE, PENDING_COOKIE, SESSION_HOURS, audit, cookieOpts, getStaff, readToken, setupAllowedFrom, signToken, staffCount,
} from "@/lib/admin/session";
import { decryptSecret, encryptSecret, hashRecovery, newRecoveryCodes, newTotpSecret, otpauthUrl, verifyTotp } from "@/lib/admin/totp";
import type { StaffRow } from "@/lib/db/schema";

/**
 * Admin sign-in, one route per step:
 *   GET  state     → is setup open, who's signed in
 *   POST setup     → first Owner (only while no staff exist, only from this computer or with ADMIN_SETUP_TOKEN)
 *   POST login     → email + password → next: "code" or "enroll"
 *   GET  enroll    → QR code for a new authenticator     POST enroll { code } → signed in, returns recovery codes
 *   POST verify    → { code } or { recovery } → signed in
 *   GET  invite    → ?token= → who the invite is for     POST invite { token, password } → next: "enroll"
 *   POST logout
 */
const ENROLL_COOKIE = "cf_admin_enroll";

function staffPasswordProblem(pw: unknown) {
  const s = String(pw ?? "");
  if (s.length < 12) return "Admin passwords need at least 12 characters.";
  return passwordProblem(s);
}

async function getStaffRow(id: string) {
  const [s] = await getDb().select().from(schema.staffUsers).where(eq(schema.staffUsers.id, id));
  return s ?? null;
}

/** After a correct password: remember who for five minutes while they enter the code. */
async function startSecondStep(res: NextResponse, s: StaffRow) {
  res.cookies.set(PENDING_COOKIE, signToken([s.id, s.sessionVersion], 5 * 60_000, "admin-2fa"), cookieOpts(300));
  return res;
}

async function pendingStaff() {
  const jar = await cookies();
  const parts = readToken(jar.get(PENDING_COOKIE)?.value, "admin-2fa");
  if (!parts) throw new HttpError(401, "That took too long. Enter your email and password again.");
  const s = await getStaffRow(parts[0]);
  if (!s || s.disabledAt || String(s.sessionVersion) !== parts[1]) throw new HttpError(401, "Enter your email and password again.");
  return s;
}

function signIn(res: NextResponse, s: StaffRow) {
  res.cookies.set(ADMIN_COOKIE, signToken([s.id, s.sessionVersion], SESSION_HOURS * 3600_000, "admin"), cookieOpts(SESSION_HOURS * 3600));
  res.cookies.set(PENDING_COOKIE, "", cookieOpts(0));
  res.cookies.set(ENROLL_COOKIE, "", cookieOpts(0));
  return res;
}

export const GET = route(async (req: Request, ctx: { params: Promise<{ step: string }> }) => {
  const { step } = await ctx.params;
  const url = new URL(req.url);

  if (step === "state") {
    const none = (await staffCount()) === 0;
    const me = await getStaff();
    return NextResponse.json({
      setupOpen: none && setupAllowedFrom(req, url.searchParams.get("token") || undefined),
      noStaff: none,
      me: me ? { id: me.staff.id, name: me.staff.name, email: me.staff.email, role: me.staff.role } : null,
      perms: me?.perms ?? null,
    });
  }

  if (step === "enroll") {
    const s = await pendingStaff();
    if (s.totpSecretEnc) throw new HttpError(400, "Two-step sign-in is already set up.");
    const secret = newTotpSecret();
    const res = NextResponse.json({
      secret, qr: await QRCode.toDataURL(otpauthUrl(secret, s.email), { margin: 1, width: 240, color: { dark: "#0A0A0C", light: "#FFFFFF" } }),
    });
    // GCM-encrypted and bound to this staff id, so it can't be swapped or read from the browser.
    res.cookies.set(ENROLL_COOKIE, encryptSecret(`${s.id}:${secret}`), cookieOpts(600));
    return res;
  }

  if (step === "invite") {
    const token = url.searchParams.get("token") || "";
    const [inv] = await getDb().select().from(schema.staffInvites)
      .where(and(eq(schema.staffInvites.tokenHash, sha256(token)), isNull(schema.staffInvites.usedAt), gt(schema.staffInvites.expiresAt, new Date())));
    if (!inv) throw new HttpError(404, "This invite link has expired or was already used. Ask for a new one.");
    const s = await getStaffRow(inv.staffId);
    if (!s || s.disabledAt) throw new HttpError(404, "This invite is no longer active.");
    return NextResponse.json({ email: s.email, name: s.name, role: s.role });
  }

  throw new HttpError(404, "Not found");
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ step: string }> }) => {
  const { step } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  const ip = clientIp(req);
  const db = getDb();

  if (step === "setup") {
    if (rateLimited("admin-setup:" + ip, 10, 60 * 60_000)) throw new HttpError(429, "Too many tries. Wait an hour.");
    if ((await staffCount()) > 0) throw new HttpError(409, "Setup is already done. Sign in instead.");
    if (!setupAllowedFrom(req, b.token)) throw new HttpError(403, "Set up the first Owner from the computer running the app, or with the setup token.");
    const email = normalizeEmail(b.email), name = String(b.name ?? "").trim().slice(0, 60);
    if (!name) throw new HttpError(400, "Add your name.");
    if (!isEmail(email)) throw new HttpError(400, "That email doesn't look right.");
    const issue = staffPasswordProblem(b.password);
    if (issue) throw new HttpError(400, issue);
    let s: StaffRow;
    try {
      [s] = await db.insert(schema.staffUsers).values({ email, name, role: "owner", passwordHash: await hashPassword(String(b.password)) }).returning();
    } catch (e: any) {
      if (e?.code === "23505" || e?.cause?.code === "23505") throw new HttpError(409, "Setup is already done. Sign in instead.");
      throw e;
    }
    // A second Owner created in a race would mean two people grabbed setup at once: keep only the first.
    const all = await db.select({ id: schema.staffUsers.id, createdAt: schema.staffUsers.createdAt }).from(schema.staffUsers);
    if (all.length > 1 && all.sort((a, b) => +a.createdAt - +b.createdAt)[0].id !== s.id) {
      await db.delete(schema.staffUsers).where(eq(schema.staffUsers.id, s.id));
      throw new HttpError(409, "Setup is already done. Sign in instead.");
    }
    await audit(s, "staff.setup_owner", { type: "staff", id: s.id }, { email }, req);
    return startSecondStep(NextResponse.json({ next: "enroll" }), s);
  }

  if (step === "login") {
    const email = normalizeEmail(b.email), password = String(b.password ?? "");
    if (rateLimited("admin-login:" + ip, 15, 15 * 60_000) || rateLimited("admin-login:" + email, 6, 15 * 60_000)) throw new HttpError(429, "Too many tries. Wait 15 minutes.");
    const [s] = email ? await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.email, email)) : [];
    if (!s || !s.passwordHash || s.disabledAt) { await verifyAgainstDummy(password); throw new HttpError(401, "Wrong email or password."); }
    if (!(await verifyPassword(password, s.passwordHash))) {
      await audit(s, "staff.login_failed", { type: "staff", id: s.id }, null, req);
      throw new HttpError(401, "Wrong email or password.");
    }
    return startSecondStep(NextResponse.json({ next: s.totpSecretEnc ? "code" : "enroll" }), s);
  }

  if (step === "enroll") {
    const s = await pendingStaff();
    if (s.totpSecretEnc) throw new HttpError(400, "Two-step sign-in is already set up.");
    const jar = await cookies();
    let secret = "";
    try { const [id, sec] = decryptSecret(jar.get(ENROLL_COOKIE)?.value || "").split(":"); if (id === s.id) secret = sec; } catch { /* fall through */ }
    if (!secret) throw new HttpError(400, "Scan the QR code again.");
    const stepNo = verifyTotp(secret, b.code, 0);
    if (stepNo == null) throw new HttpError(400, "That code didn't match. Check the time on your phone and try the newest code.");
    const codes = newRecoveryCodes();
    const [row] = await db.update(schema.staffUsers).set({
      totpSecretEnc: encryptSecret(secret), totpLastStep: stepNo, recoveryHashes: codes.map(hashRecovery),
      lastLoginAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(schema.staffUsers.id, s.id), isNull(schema.staffUsers.totpSecretEnc))).returning();
    if (!row) throw new HttpError(409, "Two-step sign-in is already set up.");
    await audit(row, "staff.2fa_enrolled", { type: "staff", id: row.id }, null, req);
    await audit(row, "staff.login", { type: "staff", id: row.id }, null, req);
    return signIn(NextResponse.json({ ok: true, recoveryCodes: codes }), row);
  }

  if (step === "verify") {
    const s = await pendingStaff();
    if (!s.totpSecretEnc) throw new HttpError(400, "Set up two-step sign-in first.");
    if (rateLimited("admin-2fa:" + s.id, 8, 15 * 60_000)) throw new HttpError(429, "Too many tries. Wait 15 minutes.");
    if (b.recovery) {
      const h = hashRecovery(String(b.recovery));
      const left = (s.recoveryHashes as string[]).filter(x => x !== h);
      if (left.length === (s.recoveryHashes as string[]).length) throw new HttpError(400, "That recovery code isn't valid or was already used.");
      await db.update(schema.staffUsers).set({ recoveryHashes: left, lastLoginAt: new Date() }).where(eq(schema.staffUsers.id, s.id));
      await audit(s, "staff.login_recovery_code", { type: "staff", id: s.id }, { codesLeft: left.length }, req);
      return signIn(NextResponse.json({ ok: true, codesLeft: left.length }), s);
    }
    const stepNo = verifyTotp(decryptSecret(s.totpSecretEnc), b.code, s.totpLastStep);
    if (stepNo == null) throw new HttpError(400, "That code didn't match. Try the newest one.");
    // Conditional update: the same code can't sign in twice, even in parallel.
    const [row] = await db.update(schema.staffUsers).set({ totpLastStep: stepNo, lastLoginAt: new Date() })
      .where(and(eq(schema.staffUsers.id, s.id), eq(schema.staffUsers.totpLastStep, s.totpLastStep))).returning();
    if (!row) throw new HttpError(400, "That code was just used. Wait for the next one.");
    await audit(row, "staff.login", { type: "staff", id: row.id }, null, req);
    return signIn(NextResponse.json({ ok: true }), row);
  }

  if (step === "invite") {
    if (rateLimited("admin-invite:" + ip, 10, 60 * 60_000)) throw new HttpError(429, "Too many tries. Wait an hour.");
    const issue = staffPasswordProblem(b.password);
    if (issue) throw new HttpError(400, issue);
    const [inv] = await db.update(schema.staffInvites).set({ usedAt: new Date() })
      .where(and(eq(schema.staffInvites.tokenHash, sha256(String(b.token || ""))), isNull(schema.staffInvites.usedAt), gt(schema.staffInvites.expiresAt, new Date()))).returning();
    if (!inv) throw new HttpError(404, "This invite link has expired or was already used. Ask for a new one.");
    const [s] = await db.update(schema.staffUsers).set({ passwordHash: await hashPassword(String(b.password)), updatedAt: new Date() })
      .where(and(eq(schema.staffUsers.id, inv.staffId), isNull(schema.staffUsers.disabledAt))).returning();
    if (!s) throw new HttpError(404, "This invite is no longer active.");
    await audit(s, "staff.invite_accepted", { type: "staff", id: s.id }, null, req);
    return startSecondStep(NextResponse.json({ next: s.totpSecretEnc ? "code" : "enroll" }), s);
  }

  if (step === "logout") {
    const me = await getStaff();
    if (me) await audit(me.staff, "staff.logout", { type: "staff", id: me.staff.id }, null, req);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, "", cookieOpts(0));
    return res;
  }

  throw new HttpError(404, "Not found");
});
