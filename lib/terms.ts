import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { clientIp } from "./accounts";
import { FEE_PCT } from "./contracts";
import { SITE } from "./site";
import { HttpError } from "./studio";

/**
 * One set of terms and rules for everyone. Bump this when the Terms, Clipper Terms, Streamer Terms,
 * payout rules or the app-wide rate change in a way users must agree to again. Everyone whose
 * users.terms_version differs is asked to accept before they can submit clips or post contracts.
 */
export const TERMS_VERSION = "2026-10-31";

/** The one app-wide rate, in cents per 1,000 verified views. */
export async function getRateCents(): Promise<number> {
  const [row] = await getDb().select().from(schema.appSettings).where(eq(schema.appSettings.key, "rate_cents"));
  const v = Number(row?.value);
  return Number.isInteger(v) && v > 0 ? v : SITE.rateCents;
}

/** Store an acceptance (version, rate shown, time, IP) and mark the user current. */
export async function recordAcceptance(userId: string, role: string, req: Request, rateCents?: number) {
  const now = new Date();
  const rate = rateCents ?? await getRateCents();
  const db = getDb();
  await db.insert(schema.termsAcceptances).values({
    userId, version: TERMS_VERSION, role, rateCents: rate, feePct: FEE_PCT,
    ip: clientIp(req).slice(0, 64), userAgent: (req.headers.get("user-agent") || "").slice(0, 300), acceptedAt: now,
  });
  await db.update(schema.users).set({ termsVersion: TERMS_VERSION, termsAcceptedAt: now, updatedAt: now }).where(eq(schema.users.id, userId));
}

export const termsCurrent = (u: { termsVersion: string | null } | null | undefined) => u?.termsVersion === TERMS_VERSION;

/** Block money-moving actions until the user has accepted the current terms. */
export function requireCurrentTerms(u: { termsVersion: string | null }) {
  if (!termsCurrent(u)) throw new HttpError(428, "Please accept the updated terms first.");
}
