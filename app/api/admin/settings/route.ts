import { NextResponse } from "next/server";
import { count, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { route, HttpError } from "@/lib/studio";
import { audit, requireStaff } from "@/lib/admin/session";
import { decryptSecret, verifyTotp } from "@/lib/admin/totp";
import { getRateCents, TERMS_VERSION } from "@/lib/terms";
import { FEE_PCT } from "@/lib/contracts";
import { SITE } from "@/lib/site";

/** GET /api/admin/settings — the app-wide rate, fee, payout rules and terms version with acceptance counts. */
export const GET = route(async () => {
  await requireStaff("settings");
  const db = getDb();
  const [[cur], [old], byVersion] = await Promise.all([
    db.select({ n: count() }).from(schema.users).where(sql`${schema.users.role} <> 'deleted' and ${schema.users.termsVersion} = ${TERMS_VERSION}`),
    db.select({ n: count() }).from(schema.users).where(sql`${schema.users.role} <> 'deleted' and ${schema.users.termsVersion} is distinct from ${TERMS_VERSION}`),
    db.select({ version: schema.termsAcceptances.version, n: count() }).from(schema.termsAcceptances).groupBy(schema.termsAcceptances.version),
  ]);
  const [rateRow] = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, "rate_cents"));
  return NextResponse.json({
    rate: (await getRateCents()) / 100, rateUpdatedAt: rateRow?.updatedAt ?? null, rateUpdatedBy: rateRow?.updatedBy ?? null,
    feePct: FEE_PCT, holdDays: SITE.holdDays, payoutDay: SITE.payoutDay, minPayout: SITE.minPayout, viewWindowDays: SITE.viewWindowDays, minBudget: SITE.minBudget,
    terms: { version: TERMS_VERSION, accepted: Number(cur?.n ?? 0), needToAccept: Number(old?.n ?? 0), acceptancesByVersion: byVersion.map(v => ({ version: v.version, n: Number(v.n) })) },
  });
});

/**
 * PUT /api/admin/settings { rate, code } — Owner only, with a fresh 2FA code.
 * Applies to contracts that go live from now on. Live contracts keep the rate they locked.
 */
export const PUT = route(async (req: Request) => {
  const { staff } = await requireStaff("settings", "edit", "changeSettings");
  if (staff.role !== "owner") throw new HttpError(403, "Only an Owner can change the rate.");
  const b = await req.json().catch(() => ({}));
  const rate = Number(b.rate);
  if (!Number.isFinite(rate) || rate < 0.1 || rate > 20) throw new HttpError(400, "The rate must be between $0.10 and $20.00 per 1,000 views.");
  const cents = Math.round(rate * 100);
  const step = staff.totpSecretEnc ? verifyTotp(decryptSecret(staff.totpSecretEnc), b.code, staff.totpLastStep) : null;
  if (step == null) throw new HttpError(400, "Enter the current 6-digit code from your authenticator app.");
  const db = getDb();
  await db.update(schema.staffUsers).set({ totpLastStep: step }).where(eq(schema.staffUsers.id, staff.id));
  const before = await getRateCents();
  await db.insert(schema.appSettings).values({ key: "rate_cents", value: cents, updatedBy: staff.email, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value: cents, updatedBy: staff.email, updatedAt: new Date() } });
  await audit(staff, "settings.rate_changed", { type: "setting", id: "rate_cents" }, { before, after: cents }, req);
  return NextResponse.json({ ok: true, rate: cents / 100 });
});
