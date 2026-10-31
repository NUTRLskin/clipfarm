/**
 * Removes automated-test and demo data: accounts with @test.clipfarm.dev emails, the shared demo
 * accounts (demo-clipper, demo-creator), and every contract, clip, project and reset link they own.
 * Dry run by default; pass --yes to delete.
 *   npx tsx --env-file=.env scripts/cleanup-test-data.ts [--yes]
 */
import postgres from "postgres";
import { pgOptions } from "../lib/db";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const go = process.argv.includes("--yes");
  const sql = postgres(url, { ...pgOptions(url, 1), onnotice: () => {} });
  const users = await sql<{ id: string }[]>`select id from users where email like '%@test.clipfarm.dev' or id in ('demo-clipper', 'demo-creator')`;
  const ids = users.map(u => u.id);
  if (!ids.length) { console.log("No test data found."); await sql.end(); return; }
  const contracts = (await sql<{ id: string }[]>`select id from contracts where streamer_user_id in ${sql(ids)}`).map(c => c.id);
  const [{ n: clipCount }] = await sql`select count(*)::int as n from clips where clipper_id in ${sql(ids)} ${contracts.length ? sql`or contract_id in ${sql(contracts)}` : sql``}`;
  const [{ n: projCount }] = await sql`select count(*)::int as n from projects where owner_id in ${sql(ids)}`;
  console.log(`test accounts: ${ids.length}, contracts: ${contracts.length}, clips: ${clipCount}, projects: ${projCount}`);
  if (!go) { console.log("Dry run. Re-run with --yes to delete."); await sql.end(); return; }
  await sql.begin(async tx => {
    await tx`delete from clips where clipper_id in ${tx(ids)} ${contracts.length ? tx`or contract_id in ${tx(contracts)}` : tx``}`;
    if (contracts.length) await tx`delete from contracts where id in ${tx(contracts)}`;
    await tx`delete from projects where owner_id in ${tx(ids)}`;
    await tx`delete from password_resets where user_id in ${tx(ids)}`;
    await tx`delete from users where id in ${tx(ids)}`;
  });
  console.log("Deleted.");
  await sql.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
