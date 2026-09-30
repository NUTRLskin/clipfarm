/**
 * Job: analyze one Twitch VOD for highlights without downloading the video.
 *
 *  1. Twitch clips of this broadcast (Helix, with vod_offset)     — strongest signal
 *  2. Chat replay density + emote bursts (sampled every 60s)       — reaction signal
 *  3. Audio loudness per second from the audio-only HLS rendition — the moment itself
 *  4. Filmstrip: ≤360 frames pulled from the lowest video rendition, tiled into a sprite
 *
 * Signals are z-scored per VOD, merged into 5-second bins, and the top peaks become Moments.
 * Results are stored once per VOD and reused by every clipper.
 */
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../lib/db";
import { putFile, putBuffer } from "../lib/storage";
import { getVod, listClipsForVod, type TwitchClip } from "../lib/twitch";
import type { Moment, MomentReason } from "../lib/moments";
import { run } from "./proc";
import { sampleChat } from "./twitchChat";

const YTDLP = process.env.YTDLP_PATH || "yt-dlp";
const BIN = 5; // seconds per scoring bin

async function update(vodId: string, patch: Partial<typeof schema.vodAnalyses.$inferInsert>) {
  await getDb().update(schema.vodAnalyses).set({ ...patch, updatedAt: new Date() }).where(eq(schema.vodAnalyses.vodId, vodId));
}

/** Direct HLS playlist URL for a yt-dlp format selector. */
async function hlsUrl(vodUrl: string, format: string): Promise<string | null> {
  try {
    const { stdout } = await run(YTDLP, ["--no-playlist", "-g", "-f", format, vodUrl], { stdoutBuffer: true });
    const u = stdout.toString().trim().split("\n")[0];
    return u.startsWith("http") ? u : null;
  } catch { return null; }
}

/** Stream mono PCM from ffmpeg and reduce it to one RMS value per second, never buffering the whole file. */
function loudnessPerSecond(input: string, duration: number, onProgress: (p: number) => void): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const rate = 8000;
    const out = new Float32Array(Math.ceil(duration) + 1);
    const p = spawn("ffmpeg", ["-v", "error", "-i", input, "-vn", "-ac", "1", "-ar", String(rate), "-f", "s16le", "-"]);
    let carry: Buffer = Buffer.alloc(0), sec = 0, acc = 0, n = 0, lastProg = 0;
    p.stdout.on("data", (d: Buffer) => {
      const buf = carry.length ? Buffer.concat([carry, d]) : d;
      const usable = buf.length - (buf.length % 2);
      for (let i = 0; i < usable; i += 2) {
        const v = buf.readInt16LE(i) / 32768;
        acc += v * v; n++;
        if (n >= rate) { if (sec < out.length) out[sec] = Math.sqrt(acc / n); sec++; acc = 0; n = 0; }
      }
      carry = buf.subarray(usable);
      if (sec - lastProg >= 120) { lastProg = sec; onProgress(Math.min(1, sec / duration)); }
    });
    let err = "";
    p.stderr.on("data", d => { err = (err + d).slice(-2000); });
    p.on("error", reject);
    p.on("close", code => { if (sec < 5 && code !== 0) reject(new Error(`ffmpeg audio: ${err}`)); else resolve(out); });
  });
}

/** Pull one frame every `interval` seconds from an HLS rendition and tile them into a sprite sheet. */
async function filmstrip(m3u8: string, duration: number, dir: string, onProgress: (p: number) => void) {
  const count = Math.min(360, Math.max(48, Math.ceil(duration / 30)));
  const interval = duration / count;
  const tw = 160, th = 90, cols = 12, rows = Math.ceil(count / cols);
  const fdir = path.join(dir, "frames"); fs.mkdirSync(fdir, { recursive: true });
  const placeholder = path.join(dir, "blank.jpg");
  await run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `color=c=0x1a1a24:s=${tw}x${th}`, "-frames:v", "1", placeholder]);

  let i = 0, done = 0, ok = 0;
  const grab = async () => {
    while (i < count) {
      const k = i++;
      const t = Math.min(duration - 1, k * interval + interval / 2);
      const file = path.join(fdir, `f${String(k).padStart(4, "0")}.jpg`);
      try {
        await run("timeout", ["45", "ffmpeg", "-y", "-v", "error", "-ss", t.toFixed(1), "-i", m3u8, "-frames:v", "1", "-vf", `scale=${tw}:${th}`, "-q:v", "6", file]);
        if (fs.existsSync(file)) ok++; else fs.copyFileSync(placeholder, file);
      } catch { fs.copyFileSync(placeholder, file); }
      if (++done % 12 === 0) onProgress(done / count);
    }
  };
  await Promise.all(Array.from({ length: 4 }, grab));
  if (ok < count * 0.3) throw new Error("Couldn't read frames from the VOD stream");
  const sheet = path.join(dir, "vod-thumbs.jpg");
  await run("ffmpeg", ["-y", "-v", "error", "-framerate", "1", "-i", path.join(fdir, "f%04d.jpg"), "-vf", `tile=${cols}x${rows}`, "-frames:v", "1", "-q:v", "5", sheet]);
  fs.rmSync(fdir, { recursive: true, force: true });
  return { sheet, info: { interval, cols, rows, tw, th, count } };
}

// ── Scoring ──────────────────────────────────────────────────────────────────
const zscore = (arr: Float32Array) => {
  let n = 0, mean = 0, m2 = 0;
  for (const v of arr) if (Number.isFinite(v)) { n++; const d = v - mean; mean += d / n; m2 += d * (v - mean); }
  const sd = n > 1 ? Math.sqrt(m2 / (n - 1)) : 1;
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = sd > 1e-9 ? (arr[i] - mean) / sd : 0;
  return out;
};
const smooth = (arr: Float32Array, r = 1) => {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) { let s = 0, c = 0; for (let k = -r; k <= r; k++) { const j = i + k; if (j >= 0 && j < arr.length) { s += arr[j]; c++; } } out[i] = s / c; }
  return out;
};
const dbRel = (x: number) => 20 * Math.log10(Math.max(1e-5, x));

export function scoreMoments(opts: {
  duration: number; clips: TwitchClip[];
  chat: { t: number; perSec: number; emoteRatio: number }[] | null;
  loud: Float32Array | null;
}): Moment[] {
  const { duration, clips } = opts;
  const nB = Math.max(1, Math.ceil(duration / BIN));
  const total = new Float32Array(nB);
  const chatZ = new Float32Array(nB), audioZ = new Float32Array(nB), clipS = new Float32Array(nB);
  const clipsAt: TwitchClip[][] = Array.from({ length: nB }, () => []);

  // 1. Twitch clips — log-scaled by views, spread over the clip's own window.
  if (clips.length) {
    const maxV = Math.max(...clips.map(c => c.viewCount), 1);
    for (const c of clips) {
      const amp = 0.6 + 0.4 * (Math.log1p(c.viewCount) / Math.log1p(maxV));
      const b0 = Math.max(0, Math.floor(c.vodOffset / BIN)), b1 = Math.min(nB - 1, Math.floor((c.vodOffset + c.duration) / BIN));
      for (let b = b0; b <= b1; b++) { clipS[b] += amp; clipsAt[b].push(c); }
    }
    // Many clips of the same moment → strong; cap so one viral clip doesn't drown everything.
    for (let b = 0; b < nB; b++) clipS[b] = Math.min(3, clipS[b]);
  }

  // 2. Chat density (messages/sec, sampled) → interpolate to bins → z-score, with emote burst bonus.
  let chatBase = 0;
  if (opts.chat && opts.chat.length >= 5) {
    const s = opts.chat;
    const dens = new Float32Array(nB), emo = new Float32Array(nB);
    for (let b = 0; b < nB; b++) {
      const t = b * BIN + BIN / 2;
      let k = 0; while (k < s.length - 1 && s[k + 1].t <= t) k++;
      const a = s[k], c = s[Math.min(s.length - 1, k + 1)];
      const f = c.t === a.t ? 0 : Math.min(1, Math.max(0, (t - a.t) / (c.t - a.t)));
      dens[b] = a.perSec + (c.perSec - a.perSec) * f; emo[b] = a.emoteRatio + (c.emoteRatio - a.emoteRatio) * f;
    }
    const sorted = Array.from(dens).sort((x, y) => x - y); chatBase = sorted[Math.floor(sorted.length / 2)] || 0;
    const z = zscore(smooth(dens, 1));
    for (let b = 0; b < nB; b++) chatZ[b] = Math.min(4, Math.max(0, z[b]) + Math.max(0, emo[b] - 0.35) * 1.5);
  }

  // 3. Loudness — z-score of dB per bin, positive part only.
  let loudBaseDb = 0;
  const perDb = new Float32Array(nB);
  if (opts.loud) {
    const per = perDb;
    for (let b = 0; b < nB; b++) { let m = 0, c = 0; for (let s = b * BIN; s < (b + 1) * BIN && s < opts.loud.length; s++) { m += opts.loud[s]; c++; } per[b] = dbRel(c ? m / c : 0); }
    const sorted = Array.from(per).filter(Number.isFinite).sort((x, y) => x - y); loudBaseDb = sorted[Math.floor(sorted.length / 2)] || 0;
    const z = zscore(smooth(per, 1));
    for (let b = 0; b < nB; b++) audioZ[b] = Math.min(4, Math.max(0, z[b]));
  }

  // Clips ≥ chat > audio: caps above keep one freak spike from outranking real viewer clips.
  for (let b = 0; b < nB; b++) total[b] = clipS[b] * 1.2 + chatZ[b] * 0.5 + audioZ[b] * 0.25;
  const sm = smooth(total, 1);

  // Peak picking: greedy, ≥ 150s apart (one moment, one card), top 20, ignore the noise floor.
  const order = Array.from(sm.keys()).sort((a, b) => sm[b] - sm[a]);
  const picked: number[] = [];
  const floor = 0.35;
  for (const b of order) {
    if (sm[b] < floor || picked.length >= 20) break;
    if (picked.some(p => Math.abs(p - b) * BIN < 150)) continue;
    picked.push(b);
  }
  const best = picked.length ? sm[picked[0]] : 1;

  return picked.map((b, i) => {
    const peak = b * BIN + BIN / 2;
    const reasons: MomentReason[] = [];
    const here = clipsAt[b];
    let start: number, end: number, title: string | undefined;
    if (here.length) {
      const top = here.slice().sort((x, y) => y.viewCount - x.viewCount)[0];
      start = Math.max(0, top.vodOffset); end = Math.min(duration, top.vodOffset + top.duration); title = top.title;
      const views = here.reduce((s, c) => s + c.viewCount, 0);
      reasons.push({ type: "clips", label: here.length > 1 ? `${here.length} viewers clipped this (${views.toLocaleString()} views)` : `Clipped by a viewer (${views.toLocaleString()} views)`, weight: clipS[b] });
    } else {
      // Chat reacts a beat after the moment; audio is on it. Bias the window earlier when chat dominates.
      const lead = chatZ[b] * 0.5 > audioZ[b] * 0.25 ? 15 : 5;
      start = Math.max(0, peak - lead - 25); end = Math.min(duration, start + 45);
    }
    if (chatZ[b] > 0.8) {
      const mult = chatBase > 0 ? (chatBase * (1 + chatZ[b])) / chatBase : 1 + chatZ[b];
      reasons.push({ type: "chat", label: `Chat ${mult.toFixed(1)}× faster than usual`, weight: chatZ[b] });
    }
    if (audioZ[b] > 1.2) reasons.push({ type: "audio", label: `Loud moment (+${Math.min(30, Math.max(1, Math.round(perDb[b] - loudBaseDb)))} dB)`, weight: audioZ[b] });
    if (!reasons.length) reasons.push({ type: "chat", label: "Activity spike", weight: sm[b] });
    return { id: `m${i}`, start: Math.round(start), end: Math.round(end), peak: Math.round(peak), score: Math.round((sm[b] / best) * 100) / 100, reasons, title };
  });
}

// ── Job ──────────────────────────────────────────────────────────────────────
export async function analyzeJob(payload: { vodId: string }, dir: string, onProgress: (p: number) => void) {
  const vodId = String(payload.vodId);
  await update(vodId, { status: "processing", progress: 0, error: null });
  try {
    const vod = await getVod(vodId);
    if (!vod) throw new Error("VOD not found — it may have been deleted or expired");
    const duration = vod.duration || 0;
    if (duration < 60) throw new Error("VOD is too short to analyze");
    await update(vodId, { channelLogin: vod.userLogin || null, title: vod.title, duration });
    const signals = { clips: false, chat: false, audio: false };

    // 1. Twitch clips
    let clips: TwitchClip[] = [];
    try { clips = vod.userLogin ? await listClipsForVod(vodId, vod.userLogin, vod.createdAt, duration) : []; signals.clips = clips.length > 0; }
    catch (e: any) { console.warn(`[analyze ${vodId}] clips:`, e.message); }
    onProgress(0.05);

    // 2. Chat replay (best effort)
    const chat = await sampleChat(vodId, duration).catch(() => null);
    signals.chat = !!chat;
    onProgress(0.3);

    // 3. Loudness
    let loud: Float32Array | null = null, waveKey: string | null = null;
    const audioUrl = await hlsUrl(vod.url, "Audio_Only/bestaudio/worst[vcodec!=none]");
    if (audioUrl) {
      try {
        loud = await loudnessPerSecond(audioUrl, duration, p => onProgress(0.3 + 0.3 * p));
        signals.audio = true;
        const peaks = new Uint8Array(loud.length);
        for (let i = 0; i < loud.length; i++) peaks[i] = Math.min(255, Math.round(Math.sqrt(loud[i]) * 255));
        waveKey = `vods/${vodId}/wave.json`;
        await putBuffer(waveKey, JSON.stringify({ rate: 1, peaks: Buffer.from(peaks).toString("base64") }), "application/json");
      } catch (e: any) { console.warn(`[analyze ${vodId}] audio:`, e.message); }
    }
    onProgress(0.6);

    // 4. Filmstrip
    let thumbsKey: string | null = null, thumbs: any = null;
    const videoUrl = await hlsUrl(vod.url, "160p30/160p/worst[height>=140][vcodec!=none]/worst");
    if (videoUrl) {
      try {
        const r = await filmstrip(videoUrl, duration, dir, p => onProgress(0.6 + 0.35 * p));
        thumbsKey = `vods/${vodId}/thumbs.jpg`;
        await putFile(thumbsKey, r.sheet, "image/jpeg");
        thumbs = r.info;
      } catch (e: any) { console.warn(`[analyze ${vodId}] thumbs:`, e.message); }
    }
    onProgress(0.96);

    if (!signals.clips && !signals.chat && !signals.audio) throw new Error("Couldn't read this VOD from Twitch (it may be subscriber-only)");
    const moments = scoreMoments({ duration, clips, chat, loud });
    await update(vodId, { status: "ready", progress: 1, thumbsKey, waveKey, moments, meta: { thumbs, signals, clipCount: clips.length } });
    return { vodId, moments: moments.length, signals };
  } catch (e: any) {
    await update(vodId, { status: "failed", error: String(e.message || e).slice(0, 500) });
    throw e;
  }
}
