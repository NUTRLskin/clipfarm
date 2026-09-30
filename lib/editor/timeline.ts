import type {
  AnimatableProp, AudioItem, CaptionItem, CaptionStyle, CaptionWord, Easing, Item, Keyframe, Timeline, Track,
  Transform, VideoItem, VisualItem,
} from "./types";

export const EPS = 1e-4;

export function newId(prefix = "i"): string {
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${r}`;
}

export const itemEnd = (i: { start: number; duration: number }) => i.start + i.duration;

export function totalDuration(tl: Timeline): number {
  let d = 0;
  for (const tr of tl.tracks) for (const it of tr.items) d = Math.max(d, itemEnd(it));
  return d;
}

export function isActive(i: Item, t: number) {
  return t >= i.start - EPS && t < itemEnd(i) - EPS;
}

/** Source-media time for a clip at timeline time t. */
export function sourceTime(i: VideoItem | AudioItem, t: number) {
  return i.in + (t - i.start) * i.speed;
}

export function findItem(tl: Timeline, id: string): { track: Track; item: Item; index: number } | null {
  for (const track of tl.tracks) {
    const index = track.items.findIndex(i => i.id === id);
    if (index >= 0) return { track, item: track.items[index], index };
  }
  return null;
}

/** The clip directly before `item` on its track, if they touch (for transitions). */
export function previousAdjacent(track: Track, item: Item): Item | null {
  let best: Item | null = null;
  for (const o of track.items) {
    if (o.id === item.id) continue;
    if (Math.abs(itemEnd(o) - item.start) < 0.05) best = o;
  }
  return best;
}
export function nextAdjacent(track: Track, item: Item): Item | null {
  for (const o of track.items) if (o.id !== item.id && Math.abs(o.start - itemEnd(item)) < 0.05) return o;
  return null;
}

// ── Easing / keyframes ──────────────────────────────────────────────────────
export function ease(e: Easing | undefined, p: number): number {
  p = Math.min(1, Math.max(0, p));
  switch (e) {
    case "linear": return p;
    case "easeIn": return p * p * p;
    case "easeOut": return 1 - Math.pow(1 - p, 3);
    case "hold": return 0;
    case "easeInOut": default: return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }
}

export function interpolate(kfs: Keyframe[] | undefined, t: number, fallback: number): number {
  if (!kfs || kfs.length === 0) return fallback;
  if (t <= kfs[0].t) return kfs[0].v;
  const last = kfs[kfs.length - 1];
  if (t >= last.t) return last.v;
  for (let k = 0; k < kfs.length - 1; k++) {
    const a = kfs[k], b = kfs[k + 1];
    if (t >= a.t && t <= b.t) {
      const p = (t - a.t) / Math.max(EPS, b.t - a.t);
      return a.v + (b.v - a.v) * ease(a.ease || "easeInOut", p);
    }
  }
  return fallback;
}

/** Base transform with keyframes applied (no in/out animations). */
export function keyframedTransform(i: VisualItem, t: number): Transform {
  const rel = t - i.start;
  const tf = { ...i.transform };
  if (i.keyframes) {
    for (const p of Object.keys(i.keyframes) as AnimatableProp[]) tf[p] = interpolate(i.keyframes[p], rel, tf[p]);
  }
  return tf;
}

/** Set (or add) a keyframe for a prop at timeline time t. */
export function setKeyframe(i: VisualItem, prop: AnimatableProp, t: number, v: number): VisualItem {
  const rel = Math.max(0, Math.min(i.duration, t - i.start));
  const list = [...(i.keyframes?.[prop] || [])].filter(k => Math.abs(k.t - rel) > 1 / 60);
  list.push({ t: rel, v, ease: "easeInOut" });
  list.sort((a, b) => a.t - b.t);
  return { ...i, keyframes: { ...(i.keyframes || {}), [prop]: list } } as VisualItem;
}
export function hasKeyframeAt(i: VisualItem, prop: AnimatableProp, t: number) {
  const rel = t - i.start;
  return !!i.keyframes?.[prop]?.some(k => Math.abs(k.t - rel) <= 1 / 60);
}
export function removeKeyframeAt(i: VisualItem, prop: AnimatableProp, t: number): VisualItem {
  const rel = t - i.start;
  const list = (i.keyframes?.[prop] || []).filter(k => Math.abs(k.t - rel) > 1 / 60);
  const kf = { ...(i.keyframes || {}), [prop]: list };
  if (!list.length) delete kf[prop];
  return { ...i, keyframes: kf } as VisualItem;
}

// ── Editing ops (pure) ──────────────────────────────────────────────────────
/** Split an item at timeline time t. Returns [left, right] or null if t is outside. */
export function splitItem(i: Item, t: number): [Item, Item] | null {
  if (t <= i.start + 0.02 || t >= itemEnd(i) - 0.02) return null;
  const leftDur = t - i.start;
  const left: any = { ...i, duration: leftDur };
  const right: any = { ...i, id: newId(i.type[0]), start: t, duration: i.duration - leftDur };
  if (i.type === "video" || i.type === "audio") {
    right.in = i.in + leftDur * i.speed;
    left.fadeOut = 0; right.fadeIn = 0;
    if (i.type === "video") right.transition = undefined;
  }
  if ("keyframes" in i && i.keyframes) {
    const lk: any = {}, rk: any = {};
    for (const [p, list] of Object.entries(i.keyframes)) {
      const v = interpolate(list, leftDur, (i as any).transform[p]);
      lk[p] = [...list!.filter(k => k.t < leftDur), { t: leftDur, v }];
      rk[p] = [{ t: 0, v }, ...list!.filter(k => k.t > leftDur).map(k => ({ ...k, t: k.t - leftDur }))];
    }
    left.keyframes = lk; right.keyframes = rk;
  }
  if ("animOut" in i) left.animOut = undefined;
  if ("animIn" in i) right.animIn = undefined;
  if (i.type === "caption") {
    left.words = i.words.filter(w => w.start < leftDur);
    right.words = i.words.filter(w => w.start >= leftDur).map(w => ({ ...w, start: w.start - leftDur, end: w.end - leftDur }));
  }
  return [left, right];
}

/** Would `item` overlap anything else on the track? */
export function overlaps(track: Track, item: { id: string; start: number; duration: number }) {
  return track.items.some(o => o.id !== item.id && item.start < itemEnd(o) - 0.01 && itemEnd(item) > o.start + 0.01);
}

/** First free start ≥ `from` on a track for an item of `duration`. */
export function firstFreeSlot(track: Track, from: number, duration: number): number {
  const sorted = [...track.items].sort((a, b) => a.start - b.start);
  let s = from;
  for (const o of sorted) {
    if (s + duration <= o.start + 0.01) break;
    if (s < itemEnd(o)) s = Math.max(s, itemEnd(o));
  }
  return s;
}

/** Close gaps on a track (ripple) — used after deletes on the main track. */
export function ripple(track: Track): Track {
  const sorted = [...track.items].sort((a, b) => a.start - b.start);
  let t = 0;
  return { ...track, items: sorted.map(i => { const n = { ...i, start: t }; t += i.duration; return n; }) };
}

// ── Captions ────────────────────────────────────────────────────────────────
export type TranscriptWord = { text: string; start: number; end: number }; // source seconds

/**
 * Map a source transcript through the clips on a video track onto the timeline and
 * chunk it into caption items.
 */
export function buildCaptions(
  clips: VideoItem[], transcripts: Record<string, TranscriptWord[]>, style: CaptionStyle,
  base: Pick<CaptionItem, "transform">,
): CaptionItem[] {
  const words: TranscriptWord[] = [];
  for (const c of [...clips].sort((a, b) => a.start - b.start)) {
    const tw = transcripts[c.assetId];
    if (!tw || c.muted) continue;
    const s0 = c.in, s1 = c.in + c.duration * c.speed;
    for (const w of tw) {
      const mid = (w.start + w.end) / 2;
      if (mid < s0 || mid >= s1) continue;
      const a = c.start + (Math.max(w.start, s0) - c.in) / c.speed;
      const b = c.start + (Math.min(w.end, s1) - c.in) / c.speed;
      words.push({ text: w.text.trim(), start: a, end: Math.max(a + 0.05, b) });
    }
  }
  const per = Math.max(1, style.wordsPerChunk);
  const chunks: TranscriptWord[][] = [];
  let cur: TranscriptWord[] = [];
  for (let k = 0; k < words.length; k++) {
    const w = words[k];
    const prev = cur[cur.length - 1];
    const gap = prev ? w.start - prev.end : 0;
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0);
    if (cur.length && (cur.length >= per || gap > 0.6 || chars + w.text.length > 26 * Math.max(1, per / 3))) {
      chunks.push(cur); cur = [];
    }
    cur.push(w);
    if (/[.!?]$/.test(w.text) && per > 1) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);

  return chunks.map((ch, k) => {
    const start = ch[0].start;
    const next = chunks[k + 1]?.[0].start ?? Infinity;
    const end = Math.min(next, ch[ch.length - 1].end + 0.35);
    const rel: CaptionWord[] = ch.map(w => ({ text: w.text, start: w.start - start, end: w.end - start }));
    return {
      id: newId("c"), type: "caption", start, duration: Math.max(0.2, end - start), words: rel,
      style: { ...style }, transform: { ...base.transform },
    };
  });
}

export function clampTime(t: number, tl: Timeline) {
  return Math.max(0, Math.min(t, totalDuration(tl)));
}

export function fmtTime(t: number, withFrames = false, fps = 30) {
  t = Math.max(0, t);
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  const base = `${m}:${String(s).padStart(2, "0")}`;
  if (!withFrames) return base;
  return `${base}.${String(Math.floor((t % 1) * fps)).padStart(2, "0")}`;
}
