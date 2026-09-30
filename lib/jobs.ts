import { sql, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { JobRow } from "./db/schema";

type JobType = JobRow["type"];

export async function enqueue(projectId: string | null, type: JobType, payload: Record<string, unknown>) {
  const [job] = await getDb().insert(schema.jobs).values({ projectId, type, payload }).returning();
  // Wake idle workers immediately (they also poll as a fallback).
  await getDb().execute(sql`select pg_notify('clipfarm_jobs', ${job.id})`);
  return job;
}

/** Atomically claim the oldest queued job. Safe with many workers (SKIP LOCKED). */
export async function claimJob(types?: JobType[]): Promise<JobRow | null> {
  const typeFilter = types?.length ? sql`and type::text in (${sql.join(types.map(t => sql`${t}`), sql`, `)})` : sql``;
  const rows = await getDb().execute(sql`
    update jobs set status = 'running', started_at = now(), heartbeat_at = now(), attempts = attempts + 1
    where id = (
      select id from jobs where status = 'queued' ${typeFilter}
      order by created_at for update skip locked limit 1
    )
    returning *`);
  const r: any = (rows as any)[0];
  if (!r) return null;
  return {
    id: r.id, projectId: r.project_id, type: r.type, status: r.status, progress: r.progress,
    payload: r.payload, result: r.result, error: r.error, attempts: r.attempts,
    createdAt: r.created_at, startedAt: r.started_at, heartbeatAt: r.heartbeat_at, finishedAt: r.finished_at,
  };
}

export async function setProgress(id: string, progress: number) {
  await getDb().update(schema.jobs).set({ progress: Math.max(0, Math.min(1, progress)), heartbeatAt: new Date() }).where(eq(schema.jobs.id, id));
}
/** Called periodically by the worker so long renders aren't mistaken for crashed ones. */
export async function heartbeat(id: string) {
  await getDb().update(schema.jobs).set({ heartbeatAt: new Date() }).where(eq(schema.jobs.id, id));
}
export async function finishJob(id: string, result: unknown) {
  await getDb().update(schema.jobs).set({ status: "done", progress: 1, result: result as any, finishedAt: new Date() }).where(eq(schema.jobs.id, id));
}
export async function failJob(id: string, error: string) {
  await getDb().update(schema.jobs).set({ status: "failed", error: error.slice(0, 2000), finishedAt: new Date() }).where(eq(schema.jobs.id, id));
}
/**
 * Jobs whose worker stopped heartbeating (crash/redeploy) go back to the queue. A 10-minute
 * heartbeat gap is a dead worker; a live worker heartbeats every 30s regardless of job length.
 */
export async function requeueStale(minutes = 10) {
  await getDb().execute(sql`
    update jobs set status = case when attempts >= 3 then 'failed'::job_status else 'queued'::job_status end,
      error = case when attempts >= 3 then 'Worker stopped while processing (3 attempts)' else error end
    where status = 'running' and coalesce(heartbeat_at, started_at) < now() - make_interval(mins => ${minutes})`);
}
