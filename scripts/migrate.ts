import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  if (!process.env.DATABASE_URL) { console.log("[migrate] DATABASE_URL not set — skipping"); return; }
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  // Serialise migrations across services (web + worker may boot at the same time on deploy).
  await client`select pg_advisory_lock(hashtext('clipfarm_migrate'))`;
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  } finally {
    await client`select pg_advisory_unlock(hashtext('clipfarm_migrate'))`;
    await client.end();
  }
  console.log("[migrate] up to date");
}
main().catch(e => { console.error(e); process.exit(1); });
