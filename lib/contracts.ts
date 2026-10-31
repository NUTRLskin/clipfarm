import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { ContractRow, ClipRow } from "./db/schema";
import type { Campaign, Clip } from "./mockData";

/** DB row → the Campaign shape the pages already use (dollars, not cents). */
export function contractView(c: ContractRow): Campaign & { rate: number; streamerUserId: string; state: string } {
  return {
    id: c.id, streamer: c.streamerName, initials: c.initials, twitchUser: c.twitchLogin,
    budget: c.budgetCents / 100, targetViews: c.targetViews, deliveredViews: c.deliveredViews,
    budgetUsed: c.spentCents / 100, clipsAccepted: c.clipsAccepted,
    status: (c.status === "funding" ? "upcoming" : ["open", "upcoming", "closed"].includes(c.status) ? c.status : "closed") as Campaign["status"],
    funded: c.status !== "funding",
    vods: [], rate: c.rateCents / 100, streamerUserId: c.streamerUserId,
    /** The real status: funding | open | paused | closed. */
    state: c.status,
  };
}

/** DB row → the Clip shape the pages already use. */
export function clipView(c: ClipRow, rateCents?: number): Clip {
  return {
    id: c.id, campaignId: c.contractId, title: c.title, platform: c.platform, url: c.url,
    views: c.views, earned: c.earnedCents / 100, status: (c.status as Clip["status"]) || "pending",
    submittedBy: c.clipperName || "Clipper", submittedById: c.clipperId,
    date: c.createdAt.toISOString().slice(0, 10),
    tiktokVideoId: c.tiktokVideoId ?? undefined, coverUrl: c.coverUrl ?? undefined,
    viewsSyncedAt: c.viewsSyncedAt?.toISOString(),
    ...(rateCents != null ? { rate: rateCents / 100, estimate: c.status === "pending" ? earningsCents(c.views, rateCents) / 100 : c.earnedCents / 100 } : {}),
  };
}

export async function getContract(id: string | null | undefined): Promise<ContractRow | null> {
  if (!id) return null;
  const [c] = await getDb().select().from(schema.contracts).where(eq(schema.contracts.id, id));
  return c ?? null;
}

/** Clip Farm's fee, as a percent of clipper earnings, drawn from the contract budget. Matches SITE.feePct. */
export const FEE_PCT = 20;

/** Split a clipper payout and its fee so earned + fee never exceeds `left` cents. */
export function splitBudget(wantCents: number, leftCents: number) {
  const maxEarned = Math.floor((leftCents * 100) / (100 + FEE_PCT));
  const earned = Math.max(0, Math.min(wantCents, maxEarned));
  // When the budget runs out, the last cent or two of rounding goes to the fee so the contract closes at exactly $0 left.
  const fee = wantCents >= maxEarned ? leftCents - earned : Math.min(Math.round((earned * FEE_PCT) / 100), leftCents - earned);
  return { earned, fee };
}

/** What a clipper earns for `views` on a contract, in cents, rounded down. */
export const earningsCents = (views: number, rateCents: number) => Math.floor((Math.max(0, views) * rateCents) / 1000);
