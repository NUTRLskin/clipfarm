import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash, createHmac } from "crypto";
import { promisify } from "util";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { UserRow } from "./db/schema";
import { AUTH_SECRET } from "./authSecret";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** "scrypt$<salt b64>$<hash b64>" */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw.normalize("NFKC"), salt, 64, SCRYPT);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const got = await scrypt(pw.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, SCRYPT);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Burns the same time as a real check so "no such email" can't be told apart by timing. */
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");
export const verifyAgainstDummy = (pw: string) => verifyPassword(pw, DUMMY_HASH);

export const normalizeEmail = (e: unknown) => String(e ?? "").trim().toLowerCase();
export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;

/** Returns a plain-English problem with the password, or null if it's fine. */
export function passwordProblem(pw: unknown): string | null {
  const s = String(pw ?? "");
  if (s.length < 8) return "Use at least 8 characters.";
  if (s.length > 200) return "That password is too long.";
  if (!/[A-Za-z]/.test(s) || !/[0-9]/.test(s)) return "Use at least one letter and one number.";
  return null;
}

export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
/** Social handles: letters, numbers, dot, underscore; stored without the @. */
export const cleanHandle = (h: unknown) => String(h ?? "").trim().replace(/^@+/, "").replace(/^https?:\/\/\S+\/@?/, "").slice(0, 40) || null;
export const HANDLE_RE = /^[A-Za-z0-9._-]{1,40}$/;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function getUserById(id: string): Promise<UserRow | null> {
  const [u] = await getDb().select().from(schema.users).where(eq(schema.users.id, id));
  return u ?? null;
}
export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const [u] = await getDb().select().from(schema.users).where(eq(schema.users.email, normalizeEmail(email)));
  return u ?? null;
}

/**
 * Find or create the account behind an OAuth / demo sign-in and return its id. Matching order:
 * provider id (Twitch id / TikTok open_id), then an explicit fixed id (demo accounts).
 */
export async function upsertExternalUser(p: {
  fixedId?: string; twitchId?: string; twitchLogin?: string; tiktokOpenId?: string;
  name?: string | null; email?: string | null; avatarUrl?: string | null; role: string;
  /** Signed-in user who asked to connect this provider (see linkCookie). */
  linkToUserId?: string | null;
}): Promise<string> {
  const db = getDb();
  let existing: UserRow | undefined;
  if (p.linkToUserId) {
    const target = await getUserById(p.linkToUserId);
    if (target && target.role !== "deleted") {
      // Refuse to move a Twitch/TikTok account that already belongs to someone else.
      const [owner] = p.twitchId ? await db.select().from(schema.users).where(eq(schema.users.twitchId, p.twitchId))
        : p.tiktokOpenId ? await db.select().from(schema.users).where(eq(schema.users.tiktokOpenId, p.tiktokOpenId)) : [];
      if (owner && owner.id !== target.id) throw new Error("That account is already connected to a different Clip Farm account");
      await db.update(schema.users).set({
        ...(p.twitchId ? { twitchId: p.twitchId, twitchLogin: p.twitchLogin || target.twitchLogin } : {}),
        ...(p.tiktokOpenId ? { tiktokOpenId: p.tiktokOpenId } : {}),
        ...(!target.avatarUrl && p.avatarUrl ? { avatarUrl: p.avatarUrl } : {}),
        lastLoginAt: new Date(), updatedAt: new Date(),
      }).where(eq(schema.users.id, target.id));
      return target.id;
    }
  }
  if (p.twitchId) [existing] = await db.select().from(schema.users).where(eq(schema.users.twitchId, p.twitchId));
  if (!existing && p.tiktokOpenId) [existing] = await db.select().from(schema.users).where(eq(schema.users.tiktokOpenId, p.tiktokOpenId));
  if (!existing && p.fixedId) [existing] = await db.select().from(schema.users).where(eq(schema.users.id, p.fixedId));
  const now = new Date();
  if (existing) {
    await db.update(schema.users).set({
      lastLoginAt: now, updatedAt: now,
      ...(p.twitchLogin ? { twitchLogin: p.twitchLogin } : {}),
      ...(!existing.avatarUrl && p.avatarUrl ? { avatarUrl: p.avatarUrl } : {}),
      ...(!existing.name && p.name ? { name: p.name } : {}),
    }).where(eq(schema.users.id, existing.id));
    return existing.id;
  }
  // Only claim the email if nobody else has it, so an OAuth login can never take over a password account.
  const email = p.email ? normalizeEmail(p.email) : null;
  const emailFree = email ? !(await getUserByEmail(email)) : false;
  const [row] = await db.insert(schema.users).values({
    ...(p.fixedId ? { id: p.fixedId } : {}),
    email: emailFree ? email : null,
    name: p.name || null, role: p.role, avatarUrl: p.avatarUrl || null,
    twitchId: p.twitchId || null, twitchLogin: p.twitchLogin || null, tiktokOpenId: p.tiktokOpenId || null,
    lastLoginAt: now,
  }).returning({ id: schema.users.id });
  return row.id;
}

export async function touchLogin(id: string) {
  await getDb().update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, id));
}

/** What the profile page and /api/account/profile show. Never includes the password hash. */
export function publicProfile(u: UserRow) {
  return {
    id: u.id, email: u.email, name: u.name, username: u.username, role: u.role, bio: u.bio,
    tiktokHandle: u.tiktokHandle, instagramHandle: u.instagramHandle, youtubeHandle: u.youtubeHandle,
    country: u.country, avatarUrl: u.avatarUrl, twitchLogin: u.twitchLogin,
    hasPassword: !!u.passwordHash, tiktokConnected: !!u.tiktokOpenId, twitchConnected: !!u.twitchId,
    createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
  };
}

/** True when the profile has what a clipper needs before submitting clips. */
export const profileComplete = (u: Pick<UserRow, "username" | "tiktokHandle" | "name">) => !!(u.name && u.username && u.tiktokHandle);

export const usernameTaken = async (username: string, exceptId: string) => {
  const [r] = await getDb().select({ id: schema.users.id }).from(schema.users)
    .where(sql`${schema.users.username} = ${username} and ${schema.users.id} <> ${exceptId}`);
  return !!r;
};

/** Tiny in-memory limiter for sign-in / sign-up / reset. Per server instance; enough to slow guessing. */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k);
  return arr.length > max;
}
/** The right-most forwarded address is the one our host's proxy added; earlier entries can be forged by the client. */
export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") || "").split(",").map(s => s.trim()).filter(Boolean).pop() || req.headers.get("x-real-ip") || "local";

/** Sign everyone out of an account (other browsers drop within a minute). */
export async function bumpSessionVersion(userId: string) {
  await getDb().update(schema.users).set({ sessionVersion: sql`${schema.users.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(schema.users.id, userId));
}

/**
 * "Connect TikTok/Twitch" while signed in: a short-lived signed cookie names the current user so
 * the OAuth sign-in that follows is attached to this account instead of creating a new one.
 */
export const LINK_COOKIE = "cf_link";
export function linkCookieValue(userId: string, ttlMs = 10 * 60_000) {
  const body = `${userId}.${Date.now() + ttlMs}`;
  return `${body}.${createHmac("sha256", AUTH_SECRET).update(body).digest("base64url")}`;
}
export function readLinkCookie(v: string | undefined | null): string | null {
  if (!v) return null;
  const i = v.lastIndexOf(".");
  const body = v.slice(0, i), sig = v.slice(i + 1);
  const want = createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  if (!sig || sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  const [userId, exp] = body.split(".");
  return Number(exp) > Date.now() ? userId : null;
}
