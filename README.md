# ClipFarm

Two-sided Twitch clip marketplace: streamers fund campaigns, clippers cut moments from the stream, post them to TikTok and get paid per view.

## Streamer side

Streamers sign in with Twitch; the session records their channel login, which keys everything below.
- **My VODs** (`/vods`) — kept broadcasts with clip-import counts; open one for the player, filmstrip and the
  same Top moments clippers see.
- **Clippers** (`/clippers`) — everyone who has pulled from the channel in Studio (projects, imports, exports,
  submitted clips, views), plus which VODs are hottest.
- **Inbox** (`/inbox`, both roles) — Postgres-backed threads, one per (streamer channel, clipper). Clippers open
  a thread from a Studio project ("✉ Message …"); a streamer sees it on sign-in even if they'd never used
  ClipFarm before. Unread counts show in the nav.

## Clipper Studio: highlights

Opening a VOD in the picker kicks off an `analyze` job (once per VOD, shared by all clippers). The worker
never downloads the video: it reads the streamer's own Twitch clips for that broadcast (Helix, with
`vod_offset`), samples chat-replay density every 60 s, streams the audio-only rendition for a loudness curve,
and pulls ≤360 frames from the 160p rendition for a filmstrip. Signals are z-scored and merged into ranked
"Top moments" (clips > chat > audio). Tapping a moment sets in/out; import still pulls only that range.

## Clipper Studio

`/studio` is the in-app editor. A clipper picks a campaign, scrubs the streamer's VOD in the Twitch player, marks in/out, and only that range is pulled at full quality. The editor then gives them a vertical-video toolkit:

- Multi-track timeline: trim, split (`S`), drag between tracks, ripple delete, speed (0.25–4×), volume/fades, undo/redo, autosave
- Vertical layouts: fill, fit + blurred background, facecam split (36/64 and 50/50), facecam bubble, gameplay zoom — with a facecam-area picker per source
- Transform with keyframes (position, scale, rotation, opacity) — drag/scale/rotate directly on the preview
- Auto captions (Whisper word timestamps) with animated presets (karaoke box, word pop, reveal, one-word, underline…), editable per word
- Text presets, emoji stickers, uploaded PNG stickers, in/out/loop animations, blend modes
- Transitions between cuts (dissolve, whip, zoom, slide, flash, blur…), effects (punch-in, beat pulse, shake, glitch, vignette, letterbox…), filter presets and manual color controls
- Music/SFX uploads, per-clip audio mix
- Server-side export (1080×1920 H.264 30/60fps), download or send to TikTok drafts

The browser preview and the export renderer share one compositor (`lib/editor/compositor.ts`), so the export matches what the clipper saw.

### Architecture

| Piece | Where |
|---|---|
| Web app (Next.js 15, App Router) | `app/`, `components/` |
| Editor state, timeline model, compositor | `lib/editor/` |
| Media worker (ingest / probe / transcribe / render) | `worker/` — run with `npm run worker` |
| Postgres schema (Drizzle) + job queue (`SKIP LOCKED` + `LISTEN/NOTIFY`) | `lib/db/`, `lib/jobs.ts`, `drizzle/` |
| Storage (Cloudflare R2, or local disk in dev) | `lib/storage.ts` |

Jobs: `ingest` (yt-dlp pulls a VOD range → normalised MP4 + 540p proxy + thumbnail sprite + waveform), `probe` (same derivatives for uploads), `transcribe` (Whisper word timestamps), `render` (ffmpeg decode → canvas compositor → ffmpeg encode, audio mixed with `amix`).

### Local development

```bash
cp .env.example .env            # fill in what you have; the rest has dev fallbacks
npm install
npm run migrate                  # needs DATABASE_URL (any Postgres)
npm run dev                      # web on :3000
npm run worker                   # in another terminal — needs ffmpeg + yt-dlp on PATH
```

Without Twitch/TikTok OAuth keys the login page offers demo accounts. Without R2 keys, files are stored under `LOCAL_STORAGE_DIR`. Set `MOCK_VOD_FILE=/path/to/a.mp4` to exercise the import pipeline without hitting Twitch. `npx tsx scripts/render-test.ts src.mp4 music.m4a out.mp4` renders a feature-heavy test timeline.

### Deploying on Railway

1. **Postgres** plugin → `DATABASE_URL` on both services. Migrations run automatically when the **web** service starts (the worker does not migrate).
2. **Web** service: builds from `railway.toml` (nixpacks). Set `AUTH_SECRET`, `NEXTAUTH_URL`, Twitch/TikTok keys, R2 keys, `OPENAI_API_KEY`.
3. **Worker** service from the same repo: set `RAILWAY_DOCKERFILE_PATH=Dockerfile.worker` plus the same `DATABASE_URL`, R2 and `OPENAI_API_KEY` vars. Give it 2+ vCPU / 4 GB — renders are CPU-bound. Scale replicas for throughput; the queue is safe with many workers.
4. **R2 bucket**: no public access needed (all URLs are presigned). Add a CORS rule allowing `PUT` and `GET` from the web origin so browser uploads work.
5. **TikTok app**: add the `video.upload` scope (Content Posting API) to enable "Send to TikTok drafts". The redirect URI is `https://<domain>/api/auth/callback/tiktok`.

### Notes

- VOD range downloads use `yt-dlp`, which is not an official Twitch API. Campaign terms should have streamers explicitly authorise clipping of their VODs. Subscriber-only VODs can't be imported.
- Imports are capped at `MAX_IMPORT_SECONDS` (default 15 min) per pull; exports at 10 minutes.
