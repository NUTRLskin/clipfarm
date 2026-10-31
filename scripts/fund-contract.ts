/**
 * Opens a contract once its budget has actually been received (until card checkout exists).
 *   npx tsx --env-file=.env scripts/fund-contract.ts <contractId>          — show it
 *   npx tsx --env-file=.env scripts/fund-contract.ts <contractId> --yes    — mark funded and open it
 */
import postgres from "postgres";
import { pgOptions } from "../lib/db";

async function main() {
  const url = process.env.DATABASE_URL, id = process.argv[2];
  if (!url || !id) throw new Error("Usage: fund-contract.ts <contractId> [--yes]");
  const sql = postgres(url, { ...pgOptions(url, 1), onnotice: () => {} });
  const [c] = await sql`select id, streamer_name, twitch_login, budget_cents, status from contracts where id = ${id}`;
  if (!c) throw new Error("No contract with that id");
  console.log(`${c.streamer_name} (twitch.tv/${c.twitch_login}) · budget $${(c.budget_cents / 100).toFixed(2)} · status ${c.status}`);
  if (c.status !== "funding") { console.log("Not waiting for funding; nothing to do."); await sql.end(); return; }
  if (!process.argv.includes("--yes")) { console.log("Confirm the money arrived, then re-run with --yes."); await sql.end(); return; }
  await sql`update contracts set status = 'open', updated_at = now() where id = ${id} and status = 'funding'`;
  console.log("Funded. Clippers can see and join it now.");
  await sql.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
