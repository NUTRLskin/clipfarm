import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const g = globalThis as any;
function make() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — Clipper Studio needs Postgres");
  const client = postgres(url, { max: Number(process.env.DB_POOL || 5) });
  return drizzle(client, { schema });
}
/** Lazily created so `next build` works without a database. */
export function getDb(): ReturnType<typeof make> {
  if (!g.__cfDb) g.__cfDb = make();
  return g.__cfDb;
}
export const dbConfigured = () => !!process.env.DATABASE_URL;
export { schema };
