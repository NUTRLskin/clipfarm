import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { VodAnalysisRow } from "./db/schema";
import { enqueue } from "./jobs";
import type { AnalysisView, Moment } from "./moments";

const mediaUrl = (r: VodAnalysisRow, v: string) => `/api/twitch/analysis/${r.vodId}/${v}?v=${r.updatedAt.getTime()}`;

export function analysisView(r: VodAnalysisRow): AnalysisView {
  const m: any = r.meta || {};
  return {
    vodId: r.vodId, status: r.status, progress: r.progress, duration: r.duration,
    thumbs: r.thumbsKey ? mediaUrl(r, "thumbs") : null, wave: r.waveKey ? mediaUrl(r, "wave") : null,
    thumbsInfo: m.thumbs || null, signals: m.signals || { clips: false, chat: false, audio: false },
    moments: (r.moments as Moment[]) || [], error: r.error,
  };
}

/**
 * Get (or start) the highlight analysis for a VOD. One row per VOD, shared by every clipper.
 * A failed analysis older than an hour, or a `pending` one with no live job, is re-queued.
 */
export async function ensureAnalysis(vodId: string, userId: string): Promise<VodAnalysisRow> {
  const db = getDb();
  let [row] = await db.select().from(schema.vodAnalyses).where(eq(schema.vodAnalyses.vodId, vodId));
  if (!row) {
    [row] = await db.insert(schema.vodAnalyses).values({ vodId, requestedBy: userId }).onConflictDoNothing().returning();
    if (!row) [row] = await db.select().from(schema.vodAnalyses).where(eq(schema.vodAnalyses.vodId, vodId));
    await enqueue(null, "analyze", { vodId });
    return row;
  }
  const staleFail = row.status === "failed" && Date.now() - row.updatedAt.getTime() > 3600_000;
  const stuck = (row.status === "pending" || row.status === "processing") && Date.now() - row.updatedAt.getTime() > 20 * 60_000;
  if (staleFail || stuck) {
    const [live] = await db.select({ n: sql<number>`count(*)` }).from(schema.jobs)
      .where(and(eq(schema.jobs.type, "analyze"), sql`${schema.jobs.payload}->>'vodId' = ${vodId}`, sql`${schema.jobs.status} in ('queued','running')`));
    if (!Number(live?.n)) {
      [row] = await db.update(schema.vodAnalyses).set({ status: "pending", progress: 0, error: null, updatedAt: new Date() }).where(eq(schema.vodAnalyses.vodId, vodId)).returning();
      await enqueue(null, "analyze", { vodId });
    }
  }
  return row;
}
