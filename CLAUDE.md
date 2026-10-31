# ClipFarm — notes for Claude

CJ's Twitch clipping web app (part of CJS Media; separate from NUTRL Skin and PropWalk).
Vault notes: `C:\Users\visio\OneDrive\Desktop\CJS MEDIA\areas\clipfarm.md`. README.md covers features and architecture.

## Where things are
- GitHub: https://github.com/NUTRLskin/clipfarm (public).
- Live (since 2026-10-31): app https://www.goclipfarm.com, admin https://www.myclipfarmadmin.com. Bare domains forward (301) to www via GoDaddy, because GoDaddy can't point a root domain at Railway.
- Railway project "strong-enthusiasm": service `clipfarm` (web) + `Postgres` (Railway database, volume-backed).

## How deploys work
- Railway production deploys the **`live`** branch (local branch `restore-full-app` pushes to it: `git push origin restore-full-app:live`). Pushing to `live` = deploying, so ask CJ first. `main` is old and not deployed.
- Zero-downtime: `railway.toml` health check is `/api/health` (app + DB). A new deploy only takes traffic once it passes; a failed build or start leaves the old version running.
- Migrations run on start (`npm run start`), serialised by an advisory lock.
- Host split (`middleware.ts`): `ADMIN_HOST` (myclipfarmadmin.com, www ignored) serves only `/admin` + `/api/admin`; every other host 404s them.
- Railway variables (names only): DATABASE_URL (→ Postgres), AUTH_SECRET, AUTH_TRUST_HOST, AUTH_URL / NEXTAUTH_URL / APP_URL / NEXT_PUBLIC_APP_URL (https://www.goclipfarm.com), ADMIN_HOST, ADMIN_URL, ADMIN_SETUP_TOKEN, TWITCH_CLIENT_ID/SECRET. No ALLOW_DEMO_LOGIN in production, ever.
- `railway.toml` (config-as-code) stops being read on 2026-12-01; before then, move its settings into the Railway UI. Nixpacks is deprecated too (still works).
- Video worker is NOT deployed (needs R2 storage shared with web). Studio import/render/captions don't run live yet.
- Local copy: `C:\Users\visio\Projects\ClipFarm` (kept out of OneDrive on purpose: node_modules + sync don't mix).
- Local database: `C:\Users\visio\Projects\clipfarm-local-db` — embedded Postgres on port 5433, db `clipfarm`. Start with `npm start` there.

## GitHub main is incomplete (found 2026-10-31)
The 2026-09-30 "Add files via upload" commits uploaded only part of the full app:
- 25 files missing (all of `app/studio`, `app/vods`, `app/inbox`, `app/clippers`, `app/api/projects|media|storage|twitch|creator|inbox`).
- 6 files landed at the repo root instead of `app/` (`globals.css`, `layout.tsx`, `page.tsx`, `review/`, `vods/`).
- `.env.example` and `.gitignore` are older versions.

The complete app is the `feat/streamer-side` branch of the git bundle `C:\Users\visio\Downloads\clipfarm-v5.bundle`
(fetched locally as `v5/*` remotes). Local branch `restore-full-app` started from that branch and is what's on `live`.

## Run it locally
1. `cd C:\Users\visio\Projects\clipfarm-local-db && npm start` (database)
2. `npx tsx --env-file=.env scripts/migrate.ts` (only after schema changes; tsx doesn't read .env on its own)
3. Web: the `clipfarm-web` preview config in the vault's `.claude/launch.json` (or `npm run dev`) → http://localhost:3000
4. Sign up with email + password, or use the demo buttons (shown only when `ALLOW_DEMO_LOGIN=1`; never set it in production).
- Worker (`npx tsx --env-file=.env worker/index.ts`) needs ffmpeg + yt-dlp on PATH — not installed yet, so VOD import/render/captions don't run locally.
- `.env` holds secrets (AUTH_SECRET, DATABASE_URL). Never commit it.

## Accounts and data (added 2026-10-31)
- Accounts, contracts and clips live in Postgres (`users`, `contracts`, `clips`, `password_resets`; migration `drizzle/0004_accounts.sql`). `lib/mockData.ts` now only supplies types and the fake VOD list used when Twitch keys are missing.
- Every table has row level security on with no policies, so Supabase's public Data API can't read them. The app connects as the owner and bypasses RLS. Any new table must do the same.
- Money is integer cents. Approving a clip locks the contract row and caps the payout at the budget left.
- `scripts/db-check.ts` lists tables, lock status and row counts. `scripts/e2e-accounts.sh` runs 56 checks against a running app (needs `ALLOW_DEMO_LOGIN=1`). `scripts/cleanup-test-data.ts --yes` removes test and demo data.

## Rules
- Web pages must work on phone, tablet and desktop; check all three before calling anything done.
- No scheduled jobs or background automations. Ask CJ before pushing to `live`, deploying, or touching Railway/GoDaddy settings (CJ allowed Railway + GoDaddy DNS work for Clip Farm on 2026-10-31).
- Before any push to `live`: `npm run typecheck`, `npx next build`, and both e2e suites must pass locally.
