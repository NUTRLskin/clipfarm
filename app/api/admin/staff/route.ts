import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { isEmail, normalizeEmail, sha256 } from "@/lib/accounts";
import { appUrl } from "@/lib/email";
import { route, HttpError } from "@/lib/studio";
import { audit, requireStaff, type StaffSession } from "@/lib/admin/session";
import { cleanPerms, clampTo, effectivePerms, type Perms } from "@/lib/admin/perms";
import type { StaffRow } from "@/lib/db/schema";

const ROLE_KEYS = ["owner", "admin", "manager", "custom"];
const INVITE_HOURS = 72;

/** GET /api/admin/staff — staff list, saved custom roles, and your own permissions. */
export const GET = route(async () => {
  const me = await requireStaff("staff");
  const db = getDb();
  const [staff, roles] = await Promise.all([
    db.select().from(schema.staffUsers).orderBy(asc(schema.staffUsers.createdAt)),
    db.select().from(schema.staffRoles).orderBy(asc(schema.staffRoles.name)),
  ]);
  const roleById = new Map(roles.map(r => [r.id, r]));
  return NextResponse.json({
    me: { id: me.staff.id, role: me.staff.role, perms: me.perms },
    roles: roles.map(r => ({ id: r.id, name: r.name, perms: r.perms })),
    staff: staff.map(s => ({
      id: s.id, name: s.name, email: s.email, role: s.role, customRoleId: s.customRoleId, customRoleName: s.customRoleId ? roleById.get(s.customRoleId)?.name ?? null : null,
      perms: s.perms, effective: effectivePerms(s, s.customRoleId ? roleById.get(s.customRoleId)?.perms : undefined),
      twoFactor: !!s.totpSecretEnc, invited: !s.passwordHash, disabled: !!s.disabledAt, lastLoginAt: s.lastLoginAt, createdAt: s.createdAt,
    })),
  });
});

async function newInvite(req: Request, staffId: string) {
  const token = randomBytes(32).toString("base64url");
  await getDb().insert(schema.staffInvites).values({ tokenHash: sha256(token), staffId, expiresAt: new Date(Date.now() + INVITE_HOURS * 3600_000) });
  return `${appUrl(req)}/admin/invite?token=${token}`;
}

/** Only Owners may create, change or remove Owners. */
function checkRoleChange(me: StaffSession, target: StaffRow | null, newRole?: string) {
  if (me.staff.role === "owner") return;
  if (newRole === "owner" || target?.role === "owner") throw new HttpError(403, "Only an Owner can add, change or remove Owners.");
}

/**
 * POST /api/admin/staff
 *   { op: "invite", email, name, role, customRoleId?, perms? } → returns a one-time invite link (72 hours) to send them yourself
 *   { op: "reinvite", id }       → fresh invite link (old ones stop working once used or expired)
 *   { op: "reset2fa", id }       → they set up 2FA again at next sign-in
 *   { op: "saveRole", id?, name, perms } → create or update a custom role
 *   { op: "deleteRole", id }
 */
export const POST = route(async (req: Request) => {
  const me = await requireStaff("staff", "edit");
  const b = await req.json().catch(() => ({}));
  const db = getDb();

  if (b.op === "invite") {
    const email = normalizeEmail(b.email), name = String(b.name ?? "").trim().slice(0, 60);
    const role = ROLE_KEYS.includes(b.role) ? b.role : "manager";
    if (!name) throw new HttpError(400, "Add their name.");
    if (!isEmail(email)) throw new HttpError(400, "That email doesn't look right.");
    checkRoleChange(me, null, role);
    const perms = clampTo(me.perms, cleanPerms(b.perms));
    let s: StaffRow;
    try {
      [s] = await db.insert(schema.staffUsers).values({
        email, name, role, customRoleId: role === "custom" ? String(b.customRoleId || "") || null : null, perms, invitedBy: me.staff.id,
      }).returning();
    } catch (e: any) {
      if (e?.code === "23505" || e?.cause?.code === "23505") throw new HttpError(409, "That email is already on the staff list.");
      throw e;
    }
    const link = await newInvite(req, s.id);
    await audit(me.staff, "staff.invited", { type: "staff", id: s.id }, { email, role, perms }, req);
    return NextResponse.json({ ok: true, link, expiresInHours: INVITE_HOURS }, { status: 201 });
  }

  if (b.op === "reinvite" || b.op === "reset2fa") {
    const [t] = await db.select().from(schema.staffUsers).where(eq(schema.staffUsers.id, String(b.id || "")));
    if (!t) throw new HttpError(404, "No such staff member");
    checkRoleChange(me, t);
    if (b.op === "reinvite") {
      const link = await newInvite(req, t.id);
      await audit(me.staff, "staff.reinvited", { type: "staff", id: t.id }, null, req);
      return NextResponse.json({ ok: true, link, expiresInHours: INVITE_HOURS });
    }
    if (t.id === me.staff.id) throw new HttpError(400, "You can't reset your own two-step sign-in here.");
    await db.update(schema.staffUsers).set({ totpSecretEnc: null, totpLastStep: 0, recoveryHashes: [], sessionVersion: sql`${schema.staffUsers.sessionVersion} + 1`, updatedAt: new Date() })
      .where(eq(schema.staffUsers.id, t.id));
    await audit(me.staff, "staff.2fa_reset", { type: "staff", id: t.id }, null, req);
    return NextResponse.json({ ok: true });
  }

  if (b.op === "saveRole") {
    const name = String(b.name ?? "").trim().slice(0, 40);
    if (!name) throw new HttpError(400, "Name the role, like Support or Accountant.");
    const perms = clampTo(me.perms, cleanPerms(b.perms));
    let row;
    if (b.id) {
      [row] = await db.update(schema.staffRoles).set({ name, perms, updatedAt: new Date() }).where(eq(schema.staffRoles.id, String(b.id))).returning();
      if (!row) throw new HttpError(404, "No such role");
      // Everyone on this role picks up the change now.
      await db.update(schema.staffUsers).set({ sessionVersion: sql`${schema.staffUsers.sessionVersion} + 1` }).where(and(eq(schema.staffUsers.customRoleId, row.id), sql`${schema.staffUsers.id} <> ${me.staff.id}`));
    } else {
      [row] = await db.insert(schema.staffRoles).values({ name, perms }).returning();
    }
    await audit(me.staff, b.id ? "staff.role_updated" : "staff.role_created", { type: "staff_role", id: row.id }, { name, perms }, req);
    return NextResponse.json({ ok: true, id: row.id });
  }

  if (b.op === "deleteRole") {
    const id = String(b.id || "");
    const inUse = await db.select({ id: schema.staffUsers.id }).from(schema.staffUsers).where(eq(schema.staffUsers.customRoleId, id));
    if (inUse.length) throw new HttpError(409, `${inUse.length} staff still use this role. Move them first.`);
    await db.delete(schema.staffRoles).where(eq(schema.staffRoles.id, id));
    await audit(me.staff, "staff.role_deleted", { type: "staff_role", id }, null, req);
    return NextResponse.json({ ok: true });
  }

  throw new HttpError(400, "Unknown request");
});

/**
 * PATCH /api/admin/staff { ids: [...], role?, customRoleId?, perms?, disable?: true, enable?: true }
 * Bulk change. Applies instantly: everyone changed is signed out and signs back in with the new access.
 */
export const PATCH = route(async (req: Request) => {
  const me = await requireStaff("staff", "edit");
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.ids) ? b.ids.map(String).slice(0, 200) : [];
  if (!ids.length) throw new HttpError(400, "Pick at least one person.");
  if (ids.includes(me.staff.id)) throw new HttpError(400, "You can't change your own access. Ask another Owner.");
  const role = b.role != null ? String(b.role) : undefined;
  if (role && !ROLE_KEYS.includes(role)) throw new HttpError(400, "Unknown role");
  const db = getDb();

  return await db.transaction(async tx => {
    const targets = await tx.select().from(schema.staffUsers).where(inArray(schema.staffUsers.id, ids)).for("update");
    if (targets.length !== ids.length) throw new HttpError(404, "Some of those people aren't on the staff list.");
    for (const t of targets) checkRoleChange(me, t, role);

    const patch: Partial<typeof schema.staffUsers.$inferInsert> = { updatedAt: new Date() };
    if (role) { patch.role = role; patch.customRoleId = role === "custom" ? String(b.customRoleId || "") || null : null; }
    if (b.perms) patch.perms = clampTo(me.perms, cleanPerms(b.perms)) as Perms;
    if (b.disable) patch.disabledAt = new Date();
    if (b.enable) patch.disabledAt = null;
    await tx.update(schema.staffUsers).set({ ...patch, sessionVersion: sql`${schema.staffUsers.sessionVersion} + 1` }).where(inArray(schema.staffUsers.id, ids));

    // There must always be an active Owner with 2FA, so nobody gets locked out.
    const [owners] = await tx.select({ n: sql<number>`count(*)` }).from(schema.staffUsers)
      .where(and(eq(schema.staffUsers.role, "owner"), isNull(schema.staffUsers.disabledAt), sql`${schema.staffUsers.totpSecretEnc} is not null`));
    if (Number(owners?.n ?? 0) < 1) throw new HttpError(409, "That would leave no active Owner. Keep at least one.");

    for (const t of targets) {
      await tx.insert(schema.auditLog).values({
        staffId: me.staff.id, staffEmail: me.staff.email, action: "staff.access_changed", targetType: "staff", targetId: t.id,
        detail: { before: { role: t.role, customRoleId: t.customRoleId, perms: t.perms, disabled: !!t.disabledAt }, after: { role: patch.role ?? t.role, customRoleId: patch.customRoleId ?? t.customRoleId, perms: patch.perms ?? t.perms, disabled: b.disable ? true : b.enable ? false : !!t.disabledAt } },
      });
    }
    return NextResponse.json({ ok: true, changed: ids.length });
  });
});
