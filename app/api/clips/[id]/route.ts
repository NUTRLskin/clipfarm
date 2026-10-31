import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { clipView, earningsCents, splitBudget } from "@/lib/contracts";
import { requireUser, route, HttpError } from "@/lib/studio";

/**
 * PATCH /api/clips/:id  { action: "approve" | "reject", views? }
 * Only the streamer who owns the clip's contract can review it, and only once.
 * Approving pays views ÷ 1,000 × the contract rate, capped at what's left in the budget.
 */
export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.action !== "approve" && body.action !== "reject") throw new HttpError(400, "action must be approve or reject");

  const updated = await getDb().transaction(async tx => {
    const [clip] = await tx.select().from(schema.clips).where(eq(schema.clips.id, id)).for("update");
    if (!clip) throw new HttpError(404, "Clip not found");
    // Lock the contract row so two approvals can't both spend the same budget.
    const [contract] = await tx.select().from(schema.contracts).where(eq(schema.contracts.id, clip.contractId)).for("update");
    if (!contract || contract.streamerUserId !== me.id) throw new HttpError(403, "Only the streamer who owns this contract can review its clips");
    if (clip.status !== "pending") throw new HttpError(409, "This clip was already reviewed");
    const now = new Date();

    if (body.action === "reject") {
      const [row] = await tx.update(schema.clips).set({ status: "rejected", reviewedAt: now, reviewedBy: me.id, updatedAt: now })
        .where(and(eq(schema.clips.id, id), eq(schema.clips.status, "pending"))).returning();
      return { row, capped: false };
    }

    // Default to the TikTok-verified count; the streamer can enter a different number.
    const views = body.views == null || body.views === "" ? clip.views : Math.floor(Number(body.views));
    if (!Number.isFinite(views) || views < 0 || views > 2_000_000_000) throw new HttpError(400, "Views must be a whole number from 0 to 2 billion");
    const left = Math.max(0, contract.budgetCents - contract.spentCents);
    if (left === 0) throw new HttpError(409, "This contract's budget is used up. Top it up before approving more clips.");
    // The clipper's earnings plus Clip Farm's fee both come out of the budget; cap the pair at what's left.
    const { earned, fee } = splitBudget(earningsCents(views, contract.rateCents), left);
    const [row] = await tx.update(schema.clips).set({ status: "paid", views, earnedCents: earned, feeCents: fee, reviewedAt: now, reviewedBy: me.id, updatedAt: now })
      .where(and(eq(schema.clips.id, id), eq(schema.clips.status, "pending"))).returning();
    await tx.update(schema.contracts).set({
      deliveredViews: sql`${schema.contracts.deliveredViews} + ${views}`,
      spentCents: sql`${schema.contracts.spentCents} + ${earned + fee}`,
      clipsAccepted: sql`${schema.contracts.clipsAccepted} + 1`,
      // Budget used up: stop taking new clips.
      ...(contract.spentCents + earned + fee >= contract.budgetCents ? { status: "closed" } : {}),
      updatedAt: now,
    }).where(eq(schema.contracts.id, contract.id));
    return { row, capped: body.action === "approve" && row.status === "paid" && row.earnedCents < earningsCents(row.views, contract.rateCents) };
  });
  return NextResponse.json({ ...clipView(updated.row), capped: updated.capped });
});
