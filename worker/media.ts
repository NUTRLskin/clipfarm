import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../lib/db";
import type { AssetRow } from "../lib/db/schema";
import { putFile, putBuffer, getToFile } from "../lib/storage";
import { ffprobe, ffTime, run } from "./proc";

export const assetPrefix = (a: Pick<AssetRow, "projectId" | "id">) => `projects/${a.projectId}/assets/${a.id}`;

export async function updateAsset(id: string, patch: Partial<AssetRow>) {
  await getDb().update(schema.assets).set({ ...patch, updatedAt: new Date() }).where(eq(schema.assets.id, id));
}

export async function getAsset(id: string) {
  const [a] = await getDb().select().from(schema.assets).where(eq(schema.assets.id, id));
  if (!a) throw new Error(`asset ${id} not found`);
  return a;
}

/** Download an asset's original to a temp dir (cached per job dir). */
export async function fetchOriginal(a: AssetRow, dir: string): Promise<string> {
  if (!a.key) throw new Error(`asset ${a.id} has no file`);
  const file = path.join(dir, `${a.id}${path.extname(a.key) || ".bin"}`);
  if (!fs.existsSync(file)) await getToFile(a.key, file);
  return file;
}

/**
 * Probe + build editing derivatives for a local media file and upload them:
 *  - proxy.mp4   540p, keyframe every 0.5s, for smooth scrubbing in the browser
 *  - thumbs.jpg  sprite sheet for the timeline filmstrip
 *  - wave.json   peak data for the timeline waveform
 */
export async function processMedia(a: AssetRow, file: string, dir: string, onProgress: (p: number) => void) {
  const probe = await ffprobe(file);
  const prefix = assetPrefix(a);
  const meta: any = { ...(a.meta as any) };
  let proxyKey: string | null = null, thumbsKey: string | null = null, waveKey: string | null = null;
  const isVideo = probe.hasVideo && a.kind !== "image" && a.kind !== "audio" && probe.duration > 0.1;

  if (isVideo) {
    const proxy = path.join(dir, "proxy.mp4");
    await run("ffmpeg", ["-y", "-i", file, "-vf", "scale=-2:540,fps=30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27",
      "-g", "15", "-keyint_min", "15", "-sc_threshold", "0", "-pix_fmt", "yuv420p",
      ...(probe.hasAudio ? ["-c:a", "aac", "-b:a", "96k", "-ac", "2"] : ["-an"]), "-movflags", "+faststart", proxy], {
      onLine: l => { const t = ffTime(l); if (t != null) onProgress(0.1 + 0.6 * Math.min(1, t / probe.duration)); },
    });
    proxyKey = `${prefix}/proxy.mp4`;
    await putFile(proxyKey, proxy, "video/mp4");

    // Filmstrip: ≤ 240 thumbs, 10 per row.
    const interval = Math.max(0.5, Math.ceil((probe.duration / 240) * 2) / 2);
    const count = Math.max(1, Math.ceil(probe.duration / interval));
    const cols = Math.min(10, count), rows = Math.ceil(count / cols);
    const tw = 160, th = Math.round(160 * ((probe.height || 9) / (probe.width || 16)));
    const thumbs = path.join(dir, "thumbs.jpg");
    await run("ffmpeg", ["-y", "-i", proxy, "-vf", `fps=1/${interval},scale=${tw}:${th},tile=${cols}x${rows}`, "-frames:v", "1", "-q:v", "5", thumbs]);
    thumbsKey = `${prefix}/thumbs.jpg`;
    await putFile(thumbsKey, thumbs, "image/jpeg");
    meta.thumbs = { interval, cols, rows, tw, th, count };
    onProgress(0.8);
  }

  if (probe.hasAudio) {
    const rate = 50; // peaks per second
    const { stdout } = await run("ffmpeg", ["-i", file, "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { stdoutBuffer: true });
    const samples = new Int16Array(stdout.buffer, stdout.byteOffset, Math.floor(stdout.byteLength / 2));
    const per = 8000 / rate;
    const n = Math.ceil(samples.length / per);
    const peaks = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      let m = 0;
      const end = Math.min(samples.length, (k + 1) * per);
      for (let s = k * per; s < end; s++) { const v = Math.abs(samples[s]); if (v > m) m = v; }
      peaks[k] = Math.min(255, Math.round(Math.sqrt(m / 32768) * 255)); // sqrt: more visible quiet parts
    }
    waveKey = `${prefix}/wave.json`;
    await putBuffer(waveKey, JSON.stringify({ rate, peaks: Buffer.from(peaks).toString("base64") }), "application/json");
  }
  onProgress(0.95);

  await updateAsset(a.id, {
    status: "ready", proxyKey, thumbsKey, waveKey, meta,
    duration: a.kind === "image" ? null : probe.duration, width: probe.width, height: probe.height, hasAudio: probe.hasAudio,
    error: null,
  });
}

/** Job: an uploaded file landed in storage — probe it and build derivatives. */
export async function probeJob(payload: { assetId: string }, dir: string, onProgress: (p: number) => void) {
  const a = await getAsset(payload.assetId);
  await updateAsset(a.id, { status: "processing" });
  try {
    const file = await fetchOriginal(a, dir);
    await processMedia(a, file, dir, onProgress);
  } catch (e: any) {
    await updateAsset(a.id, { status: "failed", error: String(e.message || e).slice(0, 500) });
    throw e;
  }
  return { assetId: a.id };
}
