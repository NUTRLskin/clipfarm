import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { route, HttpError } from "@/lib/studio";
import { audit, requireStaff } from "@/lib/admin/session";
import { getRateCents } from "@/lib/terms";

const STATUSES = ["funding", "open", "paused", "closed"];

/** GET /api/admin/contracts?status= — every contract with its locked rate and money. */
export const GET = route(async (req: Request) => {
  await requireStaff("contracts");
  const status = new URL(req.url).searchParams.get("status");
  const c = schema.contracts;
  const rows = await getDb().select().from(c).where(status && STATUSES.includes(status) ? eq(c.status, status) : undefined).orderBy(desc(c.createdAt)).limit(300);
  return NextResponse.json(rows.map(r => ({
    id: r.id, streamer: r.streamerName, twitchLogin: r.twitchLogin, streamerUserId: r.streamerUserId, status: r.status,
    budget: r.budgetCents / 100, spent: r.spentCents / 100, left: (r.budgetCents - r.spentCents) / 100, rate: r.rateCents / 100,
    targetViews: r.targetViews, deliveredViews: r.deliveredViews, clipsAccepted: r.clipsAccepted, createdAt: r.createdAt,
  })));
});

/**
 * PATCH /api/admin/contracts { id, action, note? }
 *   fund   — money received: opens the contract and locks the app-wide rate in force right now (fundContracts switch)
 *   pause / resume — stop or restart new clips
 *   end    — close it early; unspent budget becomes refundable (cancelContracts switch)
 * Live contracts are never edited otherwise (lock rule).
 */
export const PATCH = route(async (req: Request) => {
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || ""), action = String(b.action || ""), note = String(b.note || "").trim().slice(0, 300) || null;
  const moves: Record<string, { from: string[]; to: string; action?: "fundContracts" | "cancelContracts" }> = {
    fund: { from: ["funding"], to: "open", action: "fundContracts" },
    pause: { from: ["open"], to: "paused" },
    resume: { from: ["paused"], to: "open" },
    end: { from: ["open", "paused", "funding"], to: "closed", action: "cancelContracts" },
  };
  const m = moves[action];
  if (!m) throw new HttpError(400, "Unknown action");
  const { staff } = await requireStaff("contracts", "edit", m.action);
  const db = getDb();
  const [before] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, id));
  if (!before) throw new HttpError(404, "No such contract");
  if (!m.from.includes(before.status)) throw new HttpError(409, `Can't ${action} a contract that is ${before.status}.`);
  const rateCents = action === "fund" ? await getRateCents() : before.rateCents;
  const [row] = await db.update(schema.contracts).set({ status: m.to, rateCents, updatedAt: new Date() })
    .where(and(eq(schema.contracts.id, id), eq(schema.contracts.status, before.status))).returning();
  if (!row) throw new HttpError(409, "Someone else just changed this contract. Refresh.");
  await audit(staff, `contract.${action}`, { type: "contract", id }, { from: before.status, to: m.to, rateCents, budgetCents: before.budgetCents, note }, req);
  return NextResponse.json({ ok: true, status: row.status, rate: row.rateCents / 100 });
});
