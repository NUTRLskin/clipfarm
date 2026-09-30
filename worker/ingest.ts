import fs from "fs";
import path from "path";
import { putFile } from "../lib/storage";
import { ffprobe, ffTime, run } from "./proc";
import { assetPrefix, getAsset, processMedia, updateAsset } from "./media";

const hms = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60).toFixed(2);
  return `${h}:${String(m).padStart(2, "0")}:${sec.padStart(5, "0")}`;
};

/**
 * Job: pull [start, end] of a Twitch VOD at full quality (≤1080p) with yt-dlp.
 * Only the requested range is downloaded — never the whole stream.
 */
export async function ingestJob(
  payload: { assetId: string; vodUrl: string; start: number; end: number },
  dir: string, onProgress: (p: number) => void,
) {
  const a = await getAsset(payload.assetId);
  await updateAsset(a.id, { status: "processing" });
  try {
    const dur = payload.end - payload.start;
    const out = path.join(dir, "range.%(ext)s");
    // Devs can point MOCK_VOD_FILE at a local video to exercise the pipeline without Twitch.
    let downloaded: string;
    if (process.env.MOCK_VOD_FILE && process.env.NODE_ENV !== "production") {
      downloaded = path.join(dir, "range.mp4");
      await run("ffmpeg", ["-y", "-ss", String(payload.start), "-i", process.env.MOCK_VOD_FILE, "-t", String(dur), "-c", "copy", downloaded]);
    } else {
      await run(process.env.YTDLP_PATH || "yt-dlp", [
        "--no-playlist", "--no-part", "--newline",
        "-f", "best[height<=1080][vcodec!=none]/best",
        "--download-sections", `*${hms(payload.start)}-${hms(payload.end)}`,
        "--force-keyframes-at-cuts",
        "-o", out, payload.vodUrl,
      ], {
        onLine: l => {
          const t = ffTime(l);
          if (t != null) onProgress(Math.min(0.6, (t / dur) * 0.6));
          const m = /\[download\]\s+([\d.]+)%/.exec(l);
          if (m) onProgress(Math.min(0.6, (Number(m[1]) / 100) * 0.6));
        },
      });
      const f = fs.readdirSync(dir).find(f => f.startsWith("range."));
      if (!f) throw new Error("yt-dlp produced no file");
      downloaded = path.join(dir, f);
    }

    // Normalise container: H.264/AAC MP4 with the index up front. Re-encode only if copying fails.
    const src = path.join(dir, "source.mp4");
    try {
      await run("ffmpeg", ["-y", "-i", downloaded, "-c", "copy", "-movflags", "+faststart", "-avoid_negative_ts", "make_zero", src]);
      const p = await ffprobe(src);
      if (!p.hasVideo || p.duration < 0.5) throw new Error("bad remux");
    } catch {
      await run("ffmpeg", ["-y", "-i", downloaded, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", src]);
    }
    const key = `${assetPrefix(a)}/source.mp4`;
    await putFile(key, src, "video/mp4");
    await updateAsset(a.id, { key });
    onProgress(0.65);
    await processMedia({ ...a, key }, src, dir, p => onProgress(0.65 + p * 0.35));
  } catch (e: any) {
    const msg = String(e.message || e);
    const friendly = /subscriber|sub-only|only available to/i.test(msg) ? "This VOD is subscriber-only and can't be imported."
      : /404|does not exist|not found/i.test(msg) ? "VOD not found — it may have been deleted or expired."
      : msg.slice(0, 500);
    await updateAsset(a.id, { status: "failed", error: friendly });
    throw e;
  }
  return { assetId: a.id };
}
