/**
 * End-to-end check of the admin portal against a running app with NO staff yet.
 * Usage: npx tsx --env-file=.env scripts/e2e-admin.ts   (BASE defaults to http://localhost:3000)
 * Creates test staff (@test.clipfarm.dev) and deletes every staff row, invite and audit row it made at the end,
 * so the real first-Owner setup is still open afterwards.
 */
import postgres from "postgres";
import { createHmac } from "crypto";
import { base32Decode } from "../lib/admin/totp";
import { pgOptions } from "../lib/db";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (m: string) => { pass++; console.log("  ok   " + m); };
const bad = (m: string, why: unknown) => { fail++; console.log("  FAIL " + m + " -> " + JSON.stringify(why).slice(0, 240)); };
const expect = (m: string, got: unknown, want: unknown, body?: unknown) => (got === want ? ok(m) : bad(m, { got, want, body }));

class Jar {
  c = new Map<string, string>();
  async req(method: string, path: string, json?: unknown) {
    const r = await fetch(BASE + path, {
      method, redirect: "manual",
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), cookie: [...this.c].map(([k, v]) => `${k}=${v}`).join("; ") },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
    for (const sc of r.headers.getSetCookie()) {
      const [kv] = sc.split(";"); const i = kv.indexOf("=");
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      if (!v || /max-age=0/i.test(sc)) this.c.delete(k); else this.c.set(k, v);
    }
    const body = await r.json().catch(() => ({}));
    return { status: r.status, body };
  }
}

function totp(secret: string, offsetSteps = 0) {
  const step = Math.floor(Date.now() / 30_000) + offsetSteps;
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1_000_000).padStart(6, "0");
}
const nextStep = async () => { const ms = 30_000 - (Date.now() % 30_000) + 300; await new Promise(r => setTimeout(r, ms)); };

async function main() {
  const RUN = Date.now();
  const ownerEmail = `owner${RUN}@test.clipfarm.dev`, mgrEmail = `mgr${RUN}@test.clipfarm.dev`;
  const PW = "Adminpass12345";
  const owner = new Jar(), anon = new Jar(), mgr = new Jar();

  console.log("Setup");
  let r = await anon.req("GET", "/api/admin/auth/state");
  if (!r.body.noStaff) { console.log("Staff already exist; this test needs a fresh staff table. Stopping."); process.exit(1); }
  expect("setup open from localhost", r.body.setupOpen, true);
  expect("admin API blocked when signed out", (await anon.req("GET", "/api/admin/overview")).status, 401);
  expect("weak admin password refused", (await owner.req("POST", "/api/admin/auth/setup", { name: "Test Owner", email: ownerEmail, password: "short1" })).status, 400);
  r = await owner.req("POST", "/api/admin/auth/setup", { name: "Test Owner", email: ownerEmail, password: PW });
  expect("owner created, must set up 2FA", r.body.next, "enroll", r.body);
  expect("second setup refused", (await anon.req("POST", "/api/admin/auth/setup", { name: "X", email: `x${RUN}@test.clipfarm.dev`, password: PW })).status, 409);
  expect("password alone doesn't open the admin", (await owner.req("GET", "/api/admin/overview")).status, 401);
  r = await owner.req("GET", "/api/admin/auth/enroll");
  const secret: string = r.body.secret;
  r.body.qr?.startsWith("data:image/png") ? ok("QR code returned") : bad("QR code", r.body);
  expect("same QR on a second look (rescans, extra tabs)", (await owner.req("GET", "/api/admin/auth/enroll")).body.secret, secret);
  const again = new Jar();
  await again.req("POST", "/api/admin/auth/login", { email: ownerEmail, password: PW });
  expect("same QR after signing in again", (await again.req("GET", "/api/admin/auth/enroll")).body.secret, secret);
  expect("wrong code refused", (await owner.req("POST", "/api/admin/auth/enroll", { code: "000000" })).status, 400);
  r = await owner.req("POST", "/api/admin/auth/enroll", { code: totp(secret) });
  expect("2FA turned on with 10 recovery codes", r.body.recoveryCodes?.length, 10, r.body);
  const recovery: string[] = r.body.recoveryCodes;
  expect("owner sees Home", (await owner.req("GET", "/api/admin/overview")).status, 200);

  console.log("Sign in");
  const o2 = new Jar();
  expect("wrong password refused", (await o2.req("POST", "/api/admin/auth/login", { email: ownerEmail, password: "Wrongpass12345" })).status, 401);
  r = await o2.req("POST", "/api/admin/auth/login", { email: ownerEmail, password: PW });
  expect("password ok, asks for code", r.body.next, "code", r.body);
  expect("same code can't be reused", (await o2.req("POST", "/api/admin/auth/verify", { code: totp(secret) })).status, 400);
  r = await o2.req("POST", "/api/admin/auth/verify", { recovery: recovery[0] });
  expect("recovery code signs in", r.status, 200, r.body);
  const o3 = new Jar();
  await o3.req("POST", "/api/admin/auth/login", { email: ownerEmail, password: PW });
  expect("used recovery code refused", (await o3.req("POST", "/api/admin/auth/verify", { recovery: recovery[0] })).status, 400);

  console.log("Users can't reach admin");
  const user = new Jar();
  const csrf = (await user.req("GET", "/api/auth/csrf")).body.csrfToken;
  await fetch(BASE + "/api/auth/callback/clipper-demo", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: [...user.c].map(([k, v]) => `${k}=${v}`).join("; ") }, body: new URLSearchParams({ csrfToken: csrf }) })
    .then(res => { for (const sc of res.headers.getSetCookie()) { const [kv] = sc.split(";"); const i = kv.indexOf("="); user.c.set(kv.slice(0, i), kv.slice(i + 1)); } });
  [...user.c.keys()].some(k => k.includes("session-token")) ? ok("demo clipper signed in") : bad("demo clipper sign-in", [...user.c.keys()]);
  expect("a clipper session can't open the admin", (await user.req("GET", "/api/admin/users")).status, 401);

  console.log("Staff and permissions");
  r = await owner.req("POST", "/api/admin/staff", { op: "invite", name: "Test Manager", email: mgrEmail, role: "manager", perms: { sections: { home: "view", users: "view", contracts: "edit" }, actions: { suspendUsers: true } } });
  expect("invite created", r.status, 201, r.body);
  const token = new URL(r.body.link).searchParams.get("token")!;
  expect("invite link readable", (await anon.req("GET", `/api/admin/auth/invite?token=${token}`)).body.email, mgrEmail);
  r = await mgr.req("POST", "/api/admin/auth/invite", { token, password: PW });
  expect("invite accepted, set up 2FA next", r.body.next, "enroll", r.body);
  expect("invite can't be used twice", (await anon.req("POST", "/api/admin/auth/invite", { token, password: PW })).status, 404);
  const msecret = (await mgr.req("GET", "/api/admin/auth/enroll")).body.secret;
  expect("manager 2FA on", (await mgr.req("POST", "/api/admin/auth/enroll", { code: totp(msecret) })).status, 200);
  expect("manager sees Users", (await mgr.req("GET", "/api/admin/users")).status, 200);
  expect("manager blocked from Staff", (await mgr.req("GET", "/api/admin/staff")).status, 403);
  expect("manager blocked from Settings", (await mgr.req("GET", "/api/admin/settings")).status, 403);
  expect("manager blocked from Audit", (await mgr.req("GET", "/api/admin/audit")).status, 403);
  expect("manager can't suspend with only View on Users", (await mgr.req("PATCH", "/api/admin/users/nobody", { action: "suspend", reason: "x" })).status, 403);
  const mgrRow = (await owner.req("GET", "/api/admin/staff")).body.staff.find((s: any) => s.email === mgrEmail);
  r = await mgr.req("GET", "/api/admin/users");
  (r.body as any[]).every(u => !u.email || u.email.includes("•••")) ? ok("emails masked without personal-data switch") : bad("masking", r.body.slice?.(0, 2));
  expect("owner can't change own access", (await owner.req("PATCH", "/api/admin/staff", { ids: [(await owner.req("GET", "/api/admin/auth/state")).body.me.id], role: "manager" })).status, 400);
  expect("owner turns Users off for manager", (await owner.req("PATCH", "/api/admin/staff", { ids: [mgrRow.id], perms: { sections: { home: "view", users: "hidden" } } })).status, 200);
  expect("manager signed out by the change", (await mgr.req("GET", "/api/admin/users")).status, 401);
  await mgr.req("POST", "/api/admin/auth/login", { email: mgrEmail, password: PW });
  await nextStep();
  expect("manager signs back in", (await mgr.req("POST", "/api/admin/auth/verify", { code: totp(msecret) })).status, 200);
  expect("Users now blocked for manager", (await mgr.req("GET", "/api/admin/users")).status, 403);
  expect("deactivate manager", (await owner.req("PATCH", "/api/admin/staff", { ids: [mgrRow.id], disable: true })).status, 200);
  expect("deactivated manager can't sign in", (await new Jar().req("POST", "/api/admin/auth/login", { email: mgrEmail, password: PW })).status, 401);

  console.log("Settings and contracts");
  r = await owner.req("GET", "/api/admin/settings");
  expect("rate is $1.00", r.body.rate, 1, r.body);
  expect("rate change needs a 2FA code", (await owner.req("PUT", "/api/admin/settings", { rate: 1.25, code: "123456" })).status, 400);
  await nextStep();
  r = await owner.req("PUT", "/api/admin/settings", { rate: 1.25, code: totp(secret) });
  expect("owner changes rate with code", r.body.rate, 1.25, r.body);
  await nextStep();
  expect("rate set back to $1.00", (await owner.req("PUT", "/api/admin/settings", { rate: 1, code: totp(secret) })).body.rate, 1);
  r = await owner.req("GET", "/api/admin/contracts?status=funding");
  if (Array.isArray(r.body) && r.body.length) {
    const c = r.body[0];
    r = await owner.req("PATCH", "/api/admin/contracts", { id: c.id, action: "fund" });
    expect("mark contract paid opens it at $1.00", r.body.rate, 1, r.body);
    expect("can't fund twice", (await owner.req("PATCH", "/api/admin/contracts", { id: c.id, action: "fund" })).status, 409);
    expect("end needs the switch and works for owner", (await owner.req("PATCH", "/api/admin/contracts", { id: c.id, action: "end", note: "test" })).status, 200);
  } else console.log("  (no contract waiting for payment; skipped fund test)");
  r = await owner.req("GET", "/api/admin/audit");
  const actions = new Set((r.body as any[]).map(a => a.action));
  ["staff.setup_owner", "staff.2fa_enrolled", "staff.invited", "staff.access_changed", "settings.rate_changed"].every(a => actions.has(a)) ? ok("audit log recorded every step") : bad("audit", [...actions]);
  for (const p of ["/admin", "/admin/login", "/admin/setup", "/admin/users", "/admin/staff", "/admin/settings", "/admin/alerts"]) {
    expect(`page ${p}`, (await fetch(BASE + p)).status, 200);
  }
  expect("logout", (await owner.req("POST", "/api/admin/auth/logout", {})).status, 200);
  expect("signed out after logout", (await owner.req("GET", "/api/admin/overview")).status, 401);

  console.log("\nCleaning up test staff");
  const sql = postgres(process.env.DATABASE_URL!, pgOptions(process.env.DATABASE_URL!, 1));
  const ids = (await sql`select id from staff_users where email like ${"%@test.clipfarm.dev"}`).map(x => x.id);
  if (ids.length) {
    await sql`delete from audit_log where staff_id = any(${ids}) or target_id = any(${ids})`;
    await sql`delete from staff_users where id = any(${ids})`;
  }
  await sql.end();
  console.log(`removed ${ids.length} test staff`);
  console.log(`\nPASSED ${pass}  FAILED ${fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
