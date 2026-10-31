/** Prints each table, whether row level security is on, and its row count. `npx tsx --env-file=.env scripts/db-check.ts` */
import postgres from "postgres";
import { pgOptions } from "../lib/db";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = postgres(url, { ...pgOptions(url, 1), onnotice: () => {} });
  const tables = await sql`select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1`;
  for (const t of tables) {
    const [{ n }] = await sql`select count(*)::int as n from ${sql(t.tablename)}`;
    console.log(`${String(t.tablename).padEnd(16)} ${t.rowsecurity ? "locked" : "OPEN  "}  ${n} rows`);
  }
  const [m] = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
  console.log(`migrations applied: ${m.n}`);
  await sql.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
