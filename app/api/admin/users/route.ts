import { NextResponse } from "next/server";
import { and, desc, eq, ilike, isNotNull, ne, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { route } from "@/lib/studio";
import { maskEmail, requireStaff } from "@/lib/admin/session";
import { canDo } from "@/lib/admin/perms";
import { TERMS_VERSION } from "@/lib/terms";

/** GET /api/admin/users?q=&role=clipper|creator|suspended — search anyone. Emails are masked without "See full personal data". */
export const GET = route(async (req: Request) => {
  const { perms } = await requireStaff("users");
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const role = url.searchParams.get("role");
  const u = schema.users;
  const where = [ne(u.role, "deleted")];
  if (role === "clipper" || role === "creator") where.push(eq(u.role, role));
  if (role === "suspended") where.push(isNotNull(u.suspendedAt));
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, m => "\\" + m)}%`;
    where.push(or(ilike(u.name, like), ilike(u.email, like), ilike(u.username, like), ilike(u.tiktokHandle, like), ilike(u.twitchLogin, like))!);
  }
  const rows = await getDb().select({
    id: u.id, name: u.name, email: u.email, username: u.username, role: u.role, tiktokHandle: u.tiktokHandle, twitchLogin: u.twitchLogin,
    tiktokConnected: sql<boolean>`${u.tiktokOpenId} is not null`, twitchConnected: sql<boolean>`${u.twitchId} is not null`,
    termsVersion: u.termsVersion, suspendedAt: u.suspendedAt, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
    clips: sql<number>`(select count(*) from clips c where c.clipper_id = "users"."id")`,
    earned: sql<number>`(select coalesce(sum(earned_cents),0) from clips c where c.clipper_id = "users"."id" and c.status = 'paid')`,
    contracts: sql<number>`(select count(*) from contracts k where k.streamer_user_id = "users"."id")`,
  }).from(u).where(and(...where)).orderBy(desc(u.createdAt)).limit(200);
  const full = canDo(perms, "seePersonalData");
  return NextResponse.json(rows.map(r => ({
    ...r, email: full ? r.email : maskEmail(r.email), clips: Number(r.clips), earned: Number(r.earned) / 100, contracts: Number(r.contracts),
    termsCurrent: r.termsVersion === TERMS_VERSION,
  })));
});
