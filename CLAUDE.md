# ClipFarm — notes for Claude

CJ's Twitch clipping web app (part of CJS Media; separate from NUTRL Skin and PropWalk).
Vault notes: `C:\Users\visio\OneDrive\Desktop\CJS MEDIA\areas\clipfarm.md`. README.md covers features and architecture.

## Where things are
- GitHub: https://github.com/NUTRLskin/clipfarm (public). Railway deploys the web app from it (Railway login not yet checked).
- Local copy: `C:\Users\visio\Projects\ClipFarm` (kept out of OneDrive on purpose: node_modules + sync don't mix).
- Local database: `C:\Users\visio\Projects\clipfarm-local-db` — embedded Postgres on port 5433, db `clipfarm`. Start with `npm start` there.

## GitHub main is incomplete (found 2026-10-31)
The 2026-09-30 "Add files via upload" commits uploaded only part of the full app:
- 25 files missing (all of `app/studio`, `app/vods`, `app/inbox`, `app/clippers`, `app/api/projects|media|storage|twitch|creator|inbox`).
- 6 files landed at the repo root instead of `app/` (`globals.css`, `layout.tsx`, `page.tsx`, `review/`, `vods/`).
- `.env.example` and `.gitignore` are older versions.

The complete app is the `feat/streamer-side` branch of the git bundle `C:\Users\visio\Downloads\clipfarm-v5.bundle`
(fetched locally as `v5/*` remotes). Local branch `restore-full-app` = that branch + main's `.dockerignore`.
**Not pushed.** Pushing to main redeploys Railway — ask CJ first.

## Run it locally
1. `cd C:\Users\visio\Projects\clipfarm-local-db && npm start` (database)
2. `npx tsx --env-file=.env scripts/migrate.ts` (only after schema changes; tsx doesn't read .env on its own)
3. Web: the `clipfarm-web` preview config in the vault's `.claude/launch.json` (or `npm run dev`) → http://localhost:3000
4. Log in with the demo buttons (no Twitch/TikTok keys in `.env`). Demo data comes from `lib/mockData.ts`.
- Worker (`npx tsx --env-file=.env worker/index.ts`) needs ffmpeg + yt-dlp on PATH — not installed yet, so VOD import/render/captions don't run locally.
- `.env` holds a generated AUTH_SECRET and the local DATABASE_URL only. Never commit it.

## Rules
- Web pages must work on phone, tablet and desktop; check all three before calling anything done.
- No auto-deploys, scheduled jobs or background automations. Ask CJ before pushing, deploying, or touching Railway settings.
