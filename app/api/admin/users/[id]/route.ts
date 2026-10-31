import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { publicProfile, bumpSessionVersion } from "@/lib/accounts";
import { clipView, contractView } from "@/lib/contracts";
import { route, HttpError } from "@/lib/studio";
import { audit, maskEmail, requireStaff } from "@/lib/admin/session";
import { canDo } from "@/lib/admin/perms";
import { TERMS_VERSION } from "@/lib/terms";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/users/:id — profile, clips, contracts and every terms acceptance. */
export const GET = route(async (req: Request, ctx: Ctx) => {
  const { staff, perms } = await requireStaff("users");
  const { id } = await ctx.params;
  const db = getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!u) throw new HttpError(404, "No such user");
  const [clips, contracts, acceptances] = await Promise.all([
    db.select({ clip: schema.clips, rate: schema.contracts.rateCents }).from(schema.clips)
      .innerJoin(schema.contracts, eq(schema.clips.contractId, schema.contracts.id)).where(eq(schema.clips.clipperId, id)).orderBy(desc(schema.clips.createdAt)).limit(200),
    db.select().from(schema.contracts).where(eq(schema.contracts.streamerUserId, id)).orderBy(desc(schema.contracts.createdAt)),
    db.select().from(schema.termsAcceptances).where(eq(schema.termsAcceptances.userId, id)).orderBy(desc(schema.termsAcceptances.acceptedAt)),
  ]);
  const full = canDo(perms, "seePersonalData");
  if (full) await audit(staff, "user.view_personal_data", { type: "user", id }, null, req);
  const p = publicProfile(u);
  return NextResponse.json({
    profile: { ...p, email: full ? p.email : maskEmail(p.email), suspendedAt: u.suspendedAt, termsVersion: u.termsVersion, termsCurrent: u.termsVersion === TERMS_VERSION, ageConfirmedAt: u.ageConfirmedAt },
    clips: clips.map(r => clipView(r.clip, r.rate)),
    contracts: contracts.map(contractView),
    acceptances: acceptances.map(a => ({ version: a.version, role: a.role, rate: a.rateCents / 100, feePct: a.feePct, at: a.acceptedAt, ip: full ? a.ip : a.ip ? a.ip.replace(/[0-9a-f]+$/i, "•••") : null })),
  });
});

/** PATCH /api/admin/users/:id { action: "suspend" | "unsuspend" | "signout", reason? } */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");
  const reason = String(b.reason || "").trim().slice(0, 300) || null;
  const db = getDb();
  if (action === "suspend" || action === "unsuspend") {
    const { staff } = await requireStaff("users", "edit", "suspendUsers");
    if (action === "suspend" && !reason) throw new HttpError(400, "Add a reason. It goes in the audit log.");
    const [u] = await db.update(schema.users).set({ suspendedAt: action === "suspend" ? new Date() : null, updatedAt: new Date() })
      .where(eq(schema.users.id, id)).returning({ id: schema.users.id });
    if (!u) throw new HttpError(404, "No such user");
    // Suspending also signs them out everywhere within a minute.
    if (action === "suspend") await bumpSessionVersion(id);
    await audit(staff, `user.${action}`, { type: "user", id }, { reason }, req);
    return NextResponse.json({ ok: true });
  }
  if (action === "signout") {
    const { staff } = await requireStaff("users", "edit");
    await bumpSessionVersion(id);
    await audit(staff, "user.signout_everywhere", { type: "user", id }, { reason }, req);
    return NextResponse.json({ ok: true });
  }
  throw new HttpError(400, "Unknown action");
});
