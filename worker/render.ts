import fs from "fs";
import path from "path";
import { once } from "events";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { inArray, eq } from "drizzle-orm";
import { createCanvas, loadImage, ImageData } from "@napi-rs/canvas";
import { getDb, schema } from "../lib/db";
import { putFile } from "../lib/storage";
import { Compositor, referencedAssets, type Frame } from "../lib/editor/compositor";
import { nextAdjacent, totalDuration } from "../lib/editor/timeline";
import type { AssetInfo, AudioItem, Timeline, VideoItem } from "../lib/editor/types";
import { registerFonts } from "./fonts";
import { assetPrefix, fetchOriginal, updateAsset } from "./media";
import { run } from "./proc";

/** Streams decoded RGBA frames for one clip, at the timeline frame rate, in order. */
class Decoder {
  private proc: ChildProcessWithoutNullStreams;
  private chunks: Buffer[] = [];
  private len = 0;
  private ended = false;
  private wake: (() => void) | null = null;
  private index = -1;
  readonly frameBytes: number;
  readonly canvas: any;
  hasFrame = false;

  constructor(file: string, readonly start: number, readonly length: number, inPoint: number, speed: number,
    fps: number, readonly w: number, readonly h: number) {
    this.frameBytes = w * h * 4;
    this.canvas = createCanvas(w, h);
    this.proc = spawn("ffmpeg", [
      "-v", "error", "-ss", String(inPoint), "-t", String(length * speed + 0.25), "-i", file,
      "-vf", `setpts=(PTS-STARTPTS)/${speed},fps=${fps},scale=${w}:${h}:flags=bicubic`,
      "-an", "-f", "rawvideo", "-pix_fmt", "rgba", "-",
    ]);
    this.proc.stdout.on("data", (d: Buffer) => {
      this.chunks.push(d); this.len += d.length;
      if (this.len > this.frameBytes * 3) this.proc.stdout.pause();
      this.wake?.();
    });
    this.proc.stdout.on("end", () => { this.ended = true; this.wake?.(); });
    this.proc.stderr.on("data", () => {});
    this.proc.on("error", () => { this.ended = true; this.wake?.(); });
  }

  private async readFrame(): Promise<Buffer | null> {
    while (this.len < this.frameBytes && !this.ended) {
      this.proc.stdout.resume();
      await new Promise<void>(r => { this.wake = r; });
      this.wake = null;
    }
    if (this.len < this.frameBytes) return null;
    const all = this.chunks.length === 1 ? this.chunks[0] : Buffer.concat(this.chunks);
    const frame = all.subarray(0, this.frameBytes);
    const rest = all.subarray(this.frameBytes);
    this.chunks = rest.length ? [rest] : []; this.len = rest.length;
    if (this.len < this.frameBytes * 2) this.proc.stdout.resume();
    return frame;
  }

  /** Advance to the frame for timeline time t (holds the last frame past the end of the media). */
  async advanceTo(t: number, fps: number) {
    const target = Math.round((t - this.start) * fps);
    let last: Buffer | null = null;
    while (this.index < target) {
      const f = await this.readFrame();
      if (!f) break;
      this.index++; last = f;
    }
    if (last) {
      const data = new Uint8ClampedArray(last.buffer, last.byteOffset, this.frameBytes);
      this.canvas.getContext("2d").putImageData(new ImageData(data, this.w, this.h), 0, 0);
      this.hasFrame = true;
    }
  }

  close() { try { this.proc.kill("SIGKILL"); } catch { /* already gone */ } }
}

const atempo = (s: number) => {
  const out: string[] = [];
  // Defence in depth: the API validates speed, but a 0/NaN here would loop forever.
  if (!Number.isFinite(s) || s <= 0) throw new Error(`invalid clip speed ${s}`);
  s = Math.min(8, Math.max(0.1, s));
  while (s > 2) { out.push("atempo=2"); s /= 2; }
  while (s < 0.5) { out.push("atempo=0.5"); s /= 0.5; }
  if (Math.abs(s - 1) > 1e-3) out.push(`atempo=${s.toFixed(4)}`);
  return out;
};

export async function mixAudio(tl: Timeline, files: Record<string, string>, info: Record<string, AssetInfo>, total: number, out: string) {
  const inputs: string[] = [];
  const chains: string[] = [];
  const voice: string[] = [];   // labels of video-clip audio (the "speech" bus)
  const music: string[] = [];   // labels of audio-track items that don't duck
  const ducked: string[] = [];  // labels of audio-track items that duck under the voice bus
  let n = 0;
  for (const tr of tl.tracks) {
    if (tr.muted) continue;
    for (const it of tr.items) {
      if (it.type !== "video" && it.type !== "audio") continue;
      const c = it as VideoItem | AudioItem;
      if ((c as VideoItem).muted || c.volume <= 0 || !files[c.assetId] || !info[c.assetId]?.hasAudio) continue;
      inputs.push("-i", files[c.assetId]);
      const ms = Math.round(c.start * 1000);
      const f = [
        `atrim=start=${c.in.toFixed(3)}:duration=${(c.duration * c.speed).toFixed(3)}`, "asetpts=PTS-STARTPTS",
        "aformat=sample_rates=48000:channel_layouts=stereo", ...atempo(c.speed), `volume=${c.volume.toFixed(3)}`,
      ];
      if (c.fadeIn > 0) f.push(`afade=t=in:st=0:d=${c.fadeIn}`);
      if (c.fadeOut > 0) f.push(`afade=t=out:st=${Math.max(0, c.duration - c.fadeOut).toFixed(3)}:d=${c.fadeOut}`);
      if (ms > 0) f.push(`adelay=${ms}|${ms}`);
      // Pad every stem to the full length so amix/sidechain inputs line up.
      f.push(`apad=whole_dur=${total.toFixed(3)}`, `atrim=duration=${total.toFixed(3)}`);
      chains.push(`[${n}:a]${f.join(",")}[a${n}]`);
      const label = `[a${n}]`;
      if (it.type === "video") voice.push(label);
      else if ((it as AudioItem).duck) ducked.push(label);
      else music.push(label);
      n++;
    }
  }
  if (!n) {
    await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", total.toFixed(3), "-c:a", "aac", out]);
    return;
  }

  const finalInputs: string[] = [];
  if (ducked.length && voice.length) {
    // Voice bus → one copy to the mix, one sidechain copy per ducked track.
    const vb = voice.length > 1 ? (chains.push(`${voice.join("")}amix=inputs=${voice.length}:normalize=0:dropout_transition=0[voice]`), "[voice]") : voice[0];
    const scs = ducked.map((_, k) => `[sc${k}]`);
    chains.push(`${vb}asplit=${ducked.length + 1}[voiceout]${scs.join("")}`);
    finalInputs.push("[voiceout]");
    ducked.forEach((d, k) => {
      // Roughly -10 to -14 dB under speech; 20 ms attack, 400 ms release keeps it musical.
      chains.push(`${d}${scs[k]}sidechaincompress=threshold=0.015:ratio=6:attack=20:release=400:knee=2:makeup=1:level_sc=1[dk${k}]`);
      finalInputs.push(`[dk${k}]`);
    });
    finalInputs.push(...music);
  } else {
    finalInputs.push(...voice, ...music, ...ducked);
  }
  const mix = finalInputs.length > 1
    ? `${finalInputs.join("")}amix=inputs=${finalInputs.length}:normalize=0:dropout_transition=0,atrim=duration=${total.toFixed(3)},alimiter=limit=0.95[out]`
    : `${finalInputs[0]}atrim=duration=${total.toFixed(3)},alimiter=limit=0.95[out]`;
  await run("ffmpeg", ["-y", ...inputs, "-filter_complex", [...chains, mix].join(";"), "-map", "[out]", "-c:a", "aac", "-b:a", "192k", out]);
}

export async function renderTimeline(
  tl: Timeline, info: Record<string, AssetInfo>, files: Record<string, string>, dir: string, out: string,
  onProgress: (p: number) => void,
) {
  registerFonts();
  const { width: W, height: H, fps } = tl.canvas;
  const total = totalDuration(tl);
  if (total <= 0) throw new Error("Timeline is empty");
  const frames = Math.max(1, Math.round(total * fps));

  // Images
  const images: Record<string, Frame> = {};
  for (const [id, a] of Object.entries(info)) {
    if (a.kind === "image" && files[id]) {
      const img = await loadImage(fs.readFileSync(files[id]));
      images[id] = { image: img, width: img.width, height: img.height };
    }
  }

  // One decoder per distinct (asset, in, speed, start) — split layouts share a decoder.
  const decoders = new Map<string, Decoder>();
  const keyOf = (c: VideoItem) => `${c.assetId}|${c.in.toFixed(3)}|${c.speed}|${c.start.toFixed(3)}`;
  for (const tr of tl.tracks) {
    if (tr.hidden || tr.kind === "audio") continue;
    for (const it of tr.items) {
      if (it.type !== "video" || !files[it.assetId]) continue;
      const key = keyOf(it);
      const nx = nextAdjacent(tr, it);
      const handle = nx?.type === "video" && nx.transition && nx.transition.type !== "none" ? nx.transition.duration : 0;
      const len = it.duration + handle;
      const existing = decoders.get(key);
      if (existing && existing.length >= len) continue;
      existing?.close();
      const a = info[it.assetId];
      const sw = a.width || 1920, sh = a.height || 1080;
      const k = Math.min(1, 1920 / Math.max(sw, sh));
      const w = Math.round((sw * k) / 2) * 2, h = Math.round((sh * k) / 2) * 2;
      decoders.set(key, new Decoder(files[it.assetId], it.start, len, it.in, it.speed, fps, w, h));
    }
  }

  const comp = new Compositor({
    createCanvas: (w, h) => createCanvas(w, h),
    assets: info,
    image: id => images[id] || null,
    videoFrame: (c) => {
      const d = decoders.get(keyOf(c));
      return d?.hasFrame ? { image: d.canvas, width: d.w, height: d.h } : null;
    },
  });

  const audioFile = path.join(dir, "mix.m4a");
  await mixAudio(tl, files, info, total, audioFile);
  onProgress(0.03);

  const enc = spawn("ffmpeg", [
    "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(fps), "-i", "-",
    "-i", audioFile, "-map", "0:v", "-map", "1:a",
    "-c:v", "libx264", "-preset", process.env.RENDER_PRESET || "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-c:a", "copy", "-t", total.toFixed(3), "-movflags", "+faststart", out,
  ]);
  let encErr = "";
  enc.stderr.on("data", d => { encErr = (encErr + d).slice(-4000); });
  const encDone = new Promise<void>((res, rej) => enc.on("close", code => code === 0 ? res() : rej(new Error(`encoder exited ${code}: ${encErr}`))));

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  try {
    for (let f = 0; f < frames; f++) {
      const t = f / fps;
      for (const d of decoders.values()) if (t >= d.start - 1e-6 && t < d.start + d.length + 1e-6) await d.advanceTo(t, fps);
      comp.render(ctx, tl, t);
      const buf = Buffer.from(canvas.data());
      if (!enc.stdin.write(buf)) await Promise.race([once(enc.stdin, "drain"), encDone]);
      if (f % 15 === 0) onProgress(0.03 + 0.95 * (f / frames));
      // Free decoders we've passed.
      for (const [k, d] of decoders) if (t > d.start + d.length + 0.5) { d.close(); decoders.delete(k); }
    }
    enc.stdin.end();
    await encDone;
  } finally {
    for (const d of decoders.values()) d.close();
    try { enc.kill(); } catch { /* done */ }
  }
  return { duration: total, width: W, height: H };
}

/** Job: render a timeline snapshot to MP4 and store it as the project's export asset. */
export async function renderJob(
  payload: { timeline: Timeline; exportAssetId: string }, projectId: string, dir: string, onProgress: (p: number) => void,
) {
  const tl = payload.timeline;
  const ids = [...referencedAssets(tl)];
  const rows = ids.length ? await getDb().select().from(schema.assets).where(inArray(schema.assets.id, ids)) : [];
  const info: Record<string, AssetInfo> = {};
  const files: Record<string, string> = {};
  for (const r of rows) {
    if (r.projectId !== projectId) continue; // never render another project's media
    if (r.status !== "ready") throw new Error(`"${r.name}" is still processing`);
    info[r.id] = { id: r.id, kind: r.kind, width: r.width, height: r.height, duration: r.duration, hasAudio: r.hasAudio, name: r.name };
    files[r.id] = await fetchOriginal(r, dir);
  }
  await updateAsset(payload.exportAssetId, { status: "processing" });
  const out = path.join(dir, "export.mp4");
  try {
    const res = await renderTimeline(tl, info, files, dir, out, onProgress);
    const key = `${assetPrefix({ projectId, id: payload.exportAssetId })}/export.mp4`;
    await putFile(key, out, "video/mp4");
    await updateAsset(payload.exportAssetId, { status: "ready", key, duration: res.duration, width: res.width, height: res.height, hasAudio: true });
    await getDb().update(schema.projects).set({ exportAssetId: payload.exportAssetId }).where(eq(schema.projects.id, projectId));
    return { assetId: payload.exportAssetId, ...res };
  } catch (e: any) {
    await updateAsset(payload.exportAssetId, { status: "failed", error: String(e.message || e).slice(0, 500) });
    throw e;
  }
}

