import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, isNotNull, ne, sql, sum } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { route } from "@/lib/studio";
import { requireStaff } from "@/lib/admin/session";
import { getRateCents, TERMS_VERSION } from "@/lib/terms";

const n = (v: unknown) => Number(v ?? 0);

/** GET /api/admin/overview — the admin Home numbers. Money comes from contract and clip totals until the ledger lands. */
export const GET = route(async () => {
  await requireStaff("home");
  const db = getDb();
  const { users, contracts, clips } = schema;
  const now = Date.now();
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const week = new Date(now - 7 * 86_400_000), month = new Date(now - 30 * 86_400_000);
  const real = ne(users.role, "deleted");

  const [byRole, suspended, today, last7, perDay, byStatus, money, clipStats, pendingTerms, topClippers, topContracts, rateCents] = await Promise.all([
    db.select({ role: users.role, n: count() }).from(users).groupBy(users.role),
    db.select({ n: count() }).from(users).where(and(real, isNotNull(users.suspendedAt))),
    db.select({ n: count() }).from(users).where(and(real, gte(users.createdAt, dayStart))),
    db.select({ n: count() }).from(users).where(and(real, gte(users.createdAt, week))),
    db.select({ day: sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`, role: users.role, n: count() })
      .from(users).where(and(real, gte(users.createdAt, month))).groupBy(sql`1`, users.role),
    db.select({ status: contracts.status, n: count(), budget: sum(contracts.budgetCents), spent: sum(contracts.spentCents) }).from(contracts).groupBy(contracts.status),
    db.select({ earned: sum(clips.earnedCents), fees: sum(clips.feeCents), views: sum(sql`case when ${clips.status} = 'paid' then ${clips.views} else 0 end`) }).from(clips),
    db.select({ status: clips.status, n: count() }).from(clips).groupBy(clips.status),
    db.select({ n: count() }).from(users).where(and(real, sql`${users.termsVersion} is distinct from ${TERMS_VERSION}`)),
    db.select({ id: clips.clipperId, name: sql<string>`max(${clips.clipperName})`, earned: sum(clips.earnedCents), clips: count() })
      .from(clips).where(eq(clips.status, "paid")).groupBy(clips.clipperId).orderBy(desc(sum(clips.earnedCents))).limit(5),
    db.select({ id: contracts.id, streamer: contracts.streamerName, budget: contracts.budgetCents, spent: contracts.spentCents, views: contracts.deliveredViews, status: contracts.status })
      .from(contracts).orderBy(desc(contracts.spentCents)).limit(5),
    getRateCents(),
  ]);

  const roles = Object.fromEntries(byRole.map(r => [r.role, n(r.n)]));
  const st = Object.fromEntries(byStatus.map(r => [r.status, r]));
  const sumStatus = (keys: string[], f: "budget" | "spent") => keys.reduce((a, k) => a + n(st[k]?.[f]), 0);
  const days: { day: string; clippers: number; streamers: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    days.push({ day: d, clippers: 0, streamers: 0 });
  }
  for (const r of perDay) {
    const d = days.find(x => x.day === r.day);
    if (d) { if (r.role === "creator") d.streamers += n(r.n); else if (r.role === "clipper") d.clippers += n(r.n); }
  }
  const clipCounts = Object.fromEntries(clipStats.map(c => [c.status, n(c.n)]));

  return NextResponse.json({
    rate: rateCents / 100,
    users: { clippers: roles.clipper || 0, streamers: roles.creator || 0, suspended: n(suspended[0]?.n), today: n(today[0]?.n), week: n(last7[0]?.n), needTerms: n(pendingTerms[0]?.n) },
    signups: days,
    contracts: {
      live: n(st.open?.n), waitingForFunding: n(st.funding?.n), paused: n(st.paused?.n), ended: n(st.closed?.n),
      // "Held" = money streamers prepaid that isn't spent yet on live or paused contracts.
      held: (sumStatus(["open", "paused"], "budget") - sumStatus(["open", "paused"], "spent")) / 100,
      awaitingPayment: sumStatus(["funding"], "budget") / 100,
    },
    money: { clipperEarnings: n(money[0]?.earned) / 100, fees: n(money[0]?.fees) / 100, paidViews: n(money[0]?.views) },
    clips: { pending: clipCounts.pending || 0, approved: clipCounts.paid || 0, rejected: clipCounts.rejected || 0 },
    topClippers: topClippers.map(c => ({ id: c.id, name: c.name || "Clipper", earned: n(c.earned) / 100, clips: n(c.clips) })),
    topContracts: topContracts.map(c => ({ ...c, budget: c.budget / 100, spent: c.spent / 100 })),
    notBuiltYet: ["Payouts due Friday (needs Stripe)", "Open alerts and errors (needs Sentry)", "Support tickets (needs inbound email)"],
  });
});
