import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { contractView } from "@/lib/contracts";
import { getUserById } from "@/lib/accounts";
import { getRateCents, requireCurrentTerms } from "@/lib/terms";
import { SITE } from "@/lib/site";
import { requireUser, requireStreamer, route, HttpError } from "@/lib/studio";

/**
 * GET /api/campaigns          — open and upcoming contracts (what clippers browse)
 * GET /api/campaigns?mine=1   — every contract the signed-in streamer owns, any status
 */
export const GET = route(async (req: Request) => {
  const db = getDb();
  if (new URL(req.url).searchParams.get("mine")) {
    const me = await requireUser();
    const rows = await db.select().from(schema.contracts).where(eq(schema.contracts.streamerUserId, me.id)).orderBy(desc(schema.contracts.createdAt));
    return NextResponse.json(rows.map(contractView));
  }
  const rows = await db.select().from(schema.contracts).where(inArray(schema.contracts.status, ["open", "upcoming"])).orderBy(desc(schema.contracts.createdAt)).limit(200);
  return NextResponse.json(rows.map(contractView));
});

/** Create a contract for the signed-in streamer's own Twitch channel. Body: { budget, targetViews, streamer? } in dollars.
 * Every contract pays the one app-wide rate; it is copied onto the contract here and frozen. */
export const POST = route(async (req: Request) => {
  const me = await requireStreamer();
  const body = await req.json().catch(() => ({}));
  const user = await getUserById(me.id);
  if (user) requireCurrentTerms(user);
  const budget = Number(body.budget), target = Math.round(Number(body.targetViews));
  if (!Number.isFinite(budget) || budget < SITE.minBudget || budget > 1_000_000) throw new HttpError(400, `Budget must be between $${SITE.minBudget} and $1,000,000.`);
  if (!Number.isFinite(target) || target < 1000 || target > 1_000_000_000) throw new HttpError(400, "Target views must be at least 1,000.");
  const name = String(body.streamer || me.name || me.twitchLogin).trim().slice(0, 60) || me.twitchLogin;
  const [row] = await getDb().insert(schema.contracts).values({
    streamerUserId: me.id, streamerName: name, initials: name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "CF",
    // Always the signed-in channel, never a typed one, so nobody can post a contract for someone else's stream.
    twitchLogin: me.twitchLogin.toLowerCase(),
    budgetCents: Math.round(budget * 100), rateCents: await getRateCents(), targetViews: target,
    // No contract takes clips before its budget is paid. Demo accounts (local testing only) skip this.
    status: me.id === "demo-creator" && process.env.ALLOW_DEMO_LOGIN === "1" ? "open" : "funding",
  }).returning();
  return NextResponse.json(contractView(row), { status: 201 });
});
