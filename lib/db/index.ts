import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const g = globalThis as any;

/** Connection options that work for local Postgres and hosted ones (Supabase, Neon, Railway). */
export function pgOptions(url: string, max: number) {
  const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  return {
    max,
    // Hosted Postgres requires TLS; the local embedded one doesn't speak it.
    ssl: local || /sslmode=disable/.test(url) ? false as const : "require" as const,
    // Supabase's transaction pooler (port 6543) can't hold prepared statements.
    prepare: !/:6543\//.test(url),
  };
}

function make() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — Clip Farm needs Postgres");
  const client = postgres(url, pgOptions(url, Number(process.env.DB_POOL || 5)));
  return drizzle(client, { schema });
}
/** Lazily created so `next build` works without a database. */
export function getDb(): ReturnType<typeof make> {
  if (!g.__cfDb) g.__cfDb = make();
  return g.__cfDb;
}
export const dbConfigured = () => !!process.env.DATABASE_URL;
export { schema };
