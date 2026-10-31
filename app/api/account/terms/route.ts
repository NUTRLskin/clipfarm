import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getUserById } from "@/lib/accounts";
import { FEE_PCT } from "@/lib/contracts";
import { getRateCents, recordAcceptance, termsCurrent, TERMS_VERSION } from "@/lib/terms";
import { requireUser, route, HttpError } from "@/lib/studio";

/** GET /api/account/terms — the current version, the rate to show, and whether this user has accepted it. */
export const GET = route(async () => {
  const s = await requireUser();
  const u = await getUserById(s.id);
  if (!u || u.role === "deleted") throw new HttpError(401, "Sign in first");
  return NextResponse.json({ version: TERMS_VERSION, current: termsCurrent(u), rate: (await getRateCents()) / 100, feePct: FEE_PCT, role: u.role });
});

/** POST /api/account/terms { agree: true } — accept the current terms (first time after Twitch/TikTok sign-up, or after an update). */
export const POST = route(async (req: Request) => {
  const s = await requireUser();
  const u = await getUserById(s.id);
  if (!u || u.role === "deleted") throw new HttpError(401, "Sign in first");
  const b = await req.json().catch(() => ({}));
  if (b.agree !== true) throw new HttpError(400, "Please confirm you're 18 or older and agree to the Terms.");
  if (!u.ageConfirmedAt) await getDb().update(schema.users).set({ ageConfirmedAt: new Date() }).where(eq(schema.users.id, u.id));
  if (!termsCurrent(u)) await recordAcceptance(u.id, u.role, req);
  return NextResponse.json({ ok: true, version: TERMS_VERSION });
});
