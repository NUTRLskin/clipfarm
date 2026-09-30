/**
 * ClipFarm media worker. Run as a separate Railway service (see Dockerfile.worker):
 *   npm run worker
 * Needs ffmpeg, yt-dlp and the Noto Color Emoji font on the machine.
 */
import fs from "fs";
import os from "os";
import path from "path";
import postgres from "postgres";
import { claimJob, failJob, finishJob, heartbeat, requeueStale, setProgress } from "../lib/jobs";
import type { JobRow } from "../lib/db/schema";
import { registerFonts } from "./fonts";
import { ingestJob } from "./ingest";
import { probeJob } from "./media";
import { transcribeJob } from "./transcribe";
import { renderJob } from "./render";
import { analyzeJob } from "./analyze";
import { run } from "./proc";

const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY || 1));
let running = 0;
let stopping = false;

async function handle(job: JobRow) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cf-${job.type}-`));
  let last = 0;
  const onProgress = (p: number) => {
    if (p - last < 0.02 && p < 1) return;
    last = p;
    setProgress(job.id, p).catch(() => {});
  };
  const t0 = Date.now();
  console.log(`[job ${job.id}] ${job.type} start`);
  const hb = setInterval(() => { heartbeat(job.id).catch(() => {}); }, 30_000);
  try {
    const payload = job.payload as any;
    let result: unknown;
    switch (job.type) {
      case "ingest": result = await ingestJob(payload, dir, onProgress); break;
      case "probe": result = await probeJob(payload, dir, onProgress); break;
      case "transcribe": result = await transcribeJob(payload, dir, onProgress); break;
      case "render": if (!job.projectId) throw new Error("render job without project"); result = await renderJob(payload, job.projectId, dir, onProgress); break;
      case "analyze": result = await analyzeJob(payload, dir, onProgress); break;
    }
    await finishJob(job.id, result ?? null);
    console.log(`[job ${job.id}] ${job.type} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e: any) {
    console.error(`[job ${job.id}] ${job.type} failed:`, e?.message || e);
    await failJob(job.id, String(e?.message || e));
  } finally {
    clearInterval(hb);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function pump() {
  while (!stopping && running < CONCURRENCY) {
    const job = await claimJob().catch(e => { console.error("[worker] claim failed", e.message); return null; });
    if (!job) return;
    running++;
    handle(job).finally(() => { running--; pump(); });
  }
}

/** Twitch changes break yt-dlp regularly; the Docker image installs the standalone binary so -U works. */
async function updateYtDlp() {
  if (process.env.YTDLP_AUTO_UPDATE === "0") return;
  try { const r = await run(process.env.YTDLP_PATH || "yt-dlp", ["-U"], { stdoutBuffer: true }); console.log("[worker] yt-dlp:", (r.stdout.toString() || r.stderr).trim().split("\n").pop()); }
  catch (e: any) { console.warn("[worker] yt-dlp self-update skipped:", e.message?.split("\n")[0]); }
}

async function main() {
  registerFonts();
  await updateYtDlp();
  await requeueStale(10);
  // Instant wake-ups via LISTEN/NOTIFY, with polling as a safety net.
  const listener = postgres(process.env.DATABASE_URL!, { max: 1 });
  await listener.listen("clipfarm_jobs", () => { pump(); });
  setInterval(() => { pump(); }, 5000);
  setInterval(() => { requeueStale(10).catch(() => {}); }, 2 * 60_000);
  setInterval(() => { updateYtDlp(); }, 24 * 3600_000).unref();
  console.log(`[worker] ready (concurrency ${CONCURRENCY})`);
  pump();
  const stop = () => { stopping = true; console.log("[worker] stopping after current jobs"); const i = setInterval(() => { if (!running) process.exit(0); }, 500); i.unref(); };
  process.on("SIGTERM", stop); process.on("SIGINT", stop);
}
main().catch(e => { console.error(e); process.exit(1); });
