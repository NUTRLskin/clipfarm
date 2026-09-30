import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  if (!process.env.DATABASE_URL) { console.log("[migrate] DATABASE_URL not set — skipping"); return; }
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
  console.log("[migrate] up to date");
}
main().catch(e => { console.error(e); process.exit(1); });
