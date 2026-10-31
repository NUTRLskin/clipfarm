import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { count, eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import type { StaffRow } from "../db/schema";
import { AUTH_SECRET } from "../authSecret";
import { clientIp } from "../accounts";
import { HttpError } from "../studio";
import { effectivePerms, canSee, canEdit, canDo, type Perms, type Section, type Action } from "./perms";

/**
 * Staff sessions are their own signed cookie, separate from NextAuth, so a clipper or streamer
 * session can never open /admin. The cookie carries the staff id and session version; bumping
 * staff_users.session_version (permission change, deactivation, password change) signs them out.
 */
export const ADMIN_COOKIE = "cf_admin";
/** Set after a correct password, before the 2FA code. Five minutes. */
export const PENDING_COOKIE = "cf_admin_2fa";
export const SESSION_HOURS = 12;

const sign = (body: string, purpose: string) => createHmac("sha256", AUTH_SECRET + ":" + purpose).update(body).digest("base64url");

export function signToken(parts: (string | number)[], ttlMs: number, purpose: string) {
  const body = [...parts, Date.now() + ttlMs].join(".");
  return `${body}.${sign(body, purpose)}`;
}

export function readToken(v: string | undefined | null, purpose: string): string[] | null {
  if (!v) return null;
  const i = v.lastIndexOf(".");
  if (i < 0) return null;
  const body = v.slice(0, i), sig = v.slice(i + 1), want = sign(body, purpose);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  const parts = body.split(".");
  if (Number(parts.pop()) < Date.now()) return null;
  return parts;
}

export const cookieOpts = (maxAgeSec: number) => ({
  httpOnly: true, sameSite: "strict" as const, path: "/", maxAge: maxAgeSec,
  secure: process.env.NODE_ENV === "production",
});

export type StaffSession = { staff: StaffRow; perms: Perms };

/** The signed-in staff member, or null. Re-reads the row every request, so changes apply instantly. */
export async function getStaff(): Promise<StaffSession | null> {
  const jar = await cookies();
  const parts = readToken(jar.get(ADMIN_COOKIE)?.value, "admin");
  if (!parts) return null;
  const [id, sv] = parts;
  const [staff] = await getDb().select().from(schema.staffUsers).where(eq(schema.staffUsers.id, id));
  if (!staff || staff.disabledAt || String(staff.sessionVersion) !== sv || !staff.totpSecretEnc) return null;
  let custom: unknown;
  if (staff.role === "custom" && staff.customRoleId) {
    const [r] = await getDb().select().from(schema.staffRoles).where(eq(schema.staffRoles.id, staff.customRoleId));
    custom = r?.perms;
  }
  return { staff, perms: effectivePerms(staff, custom) };
}

/** Gate an admin API. level "view" to read a section, "edit" to change it; action for sensitive switches. */
export async function requireStaff(section?: Section, level: "view" | "edit" = "view", action?: Action): Promise<StaffSession> {
  const s = await getStaff();
  if (!s) throw new HttpError(401, "Sign in to the admin first");
  if (section && !(level === "edit" ? canEdit(s.perms, section) : canSee(s.perms, section))) throw new HttpError(403, "You don't have access to that.");
  if (action && !canDo(s.perms, action)) throw new HttpError(403, "That action isn't turned on for you.");
  return s;
}

export async function audit(by: StaffRow | null, action: string, target: { type?: string; id?: string } = {}, detail?: unknown, req?: Request) {
  await getDb().insert(schema.auditLog).values({
    staffId: by?.id ?? null, staffEmail: by?.email ?? null, action,
    targetType: target.type ?? null, targetId: target.id ?? null, detail: detail ?? null,
    ip: req ? clientIp(req).slice(0, 64) : null,
  });
}

export async function staffCount() {
  const [r] = await getDb().select({ n: count() }).from(schema.staffUsers);
  return Number(r?.n ?? 0);
}

/** First-owner setup is open only while no staff exist, and only from this computer or with ADMIN_SETUP_TOKEN. */
export function setupAllowedFrom(req: Request, token?: string) {
  const host = new URL(req.url).hostname;
  // The host comes from request headers, so never trust it in production: there the token is required.
  const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host);
  const want = process.env.ADMIN_SETUP_TOKEN;
  return local || (!!want && !!token && token.length === want.length && timingSafeEqual(Buffer.from(token), Buffer.from(want)));
}

/** Masks an email for staff without "See full personal data": jo•••@gmail.com */
export const maskEmail = (e: string | null | undefined) => {
  if (!e) return null;
  const [u, d] = e.split("@");
  return `${u.slice(0, 2)}•••@${d ?? ""}`;
};
