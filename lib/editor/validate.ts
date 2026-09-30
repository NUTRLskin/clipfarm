import type { Timeline } from "./types";

/**
 * Server-side sanity checks on a client-supplied timeline before it's stored or rendered.
 * The editor already clamps these, but the worker allocates `width*height*4` bytes per frame
 * and feeds `speed` straight into ffmpeg filters, so nothing here can be trusted from the browser.
 */
export const ALLOWED_CANVASES: ReadonlyArray<readonly [number, number]> = [
  [1080, 1920], // TikTok / Reels / Shorts
  [1080, 1080], // square
  [1920, 1080], // landscape (YouTube)
];
export const ALLOWED_FPS: ReadonlyArray<number> = [24, 25, 30, 60];
export const SPEED_MIN = 0.1;
export const SPEED_MAX = 8;
export const MAX_TRACKS = 32;
export const MAX_ITEMS = 2000;

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Throws a plain Error with a user-facing message; callers wrap it in an HTTP 400. */
export function validateTimeline(tl: unknown): asserts tl is Timeline {
  if (!tl || typeof tl !== "object") throw new Error("Invalid timeline");
  const t = tl as any;
  if (!Array.isArray(t.tracks) || !t.canvas) throw new Error("Invalid timeline");

  const { width, height, fps } = t.canvas;
  if (!ALLOWED_CANVASES.some(([w, h]) => w === width && h === height))
    throw new Error(`Unsupported canvas size ${width}×${height}`);
  if (!ALLOWED_FPS.includes(fps)) throw new Error(`Unsupported frame rate ${fps}`);

  if (t.tracks.length > MAX_TRACKS) throw new Error("Too many tracks");
  let items = 0;
  for (const tr of t.tracks) {
    if (!tr || !Array.isArray(tr.items)) throw new Error("Invalid track");
    for (const it of tr.items) {
      if (++items > MAX_ITEMS) throw new Error("Too many clips on the timeline");
      if (!it || typeof it !== "object") throw new Error("Invalid clip");
      if (!finite(it.start) || it.start < 0 || !finite(it.duration) || it.duration <= 0)
        throw new Error("A clip has an invalid position or length");
      if (it.type === "video" || it.type === "audio") {
        if (!finite(it.speed) || it.speed < SPEED_MIN || it.speed > SPEED_MAX)
          throw new Error(`Clip speed must be between ${SPEED_MIN}× and ${SPEED_MAX}×`);
        if (!finite(it.in) || it.in < 0) throw new Error("A clip has an invalid in-point");
        if (!finite(it.volume) || it.volume < 0 || it.volume > 4) throw new Error("A clip has an invalid volume");
        for (const k of ["fadeIn", "fadeOut"]) if (!finite(it[k]) || it[k] < 0) throw new Error("A clip has an invalid fade");
      }
      if (it.type === "video" && it.transition) {
        if (!finite(it.transition.duration) || it.transition.duration < 0 || it.transition.duration > 5)
          throw new Error("A transition has an invalid length");
      }
    }
  }
}
