"use client";
/**
 * Browser playback engine: keeps one <video>/<audio> element per clip in sync with the
 * timeline clock and feeds frames to the shared Compositor. Preview uses the 540p proxy;
 * the worker renders from the original, using the same drawing code.
 */
import { Compositor, type Frame } from "./compositor";
import { isActive, itemEnd, sourceTime, totalDuration } from "./timeline";
import type { AssetInfo, AudioItem, Item, Timeline, VideoItem } from "./types";
import type { AssetView } from "@/lib/studio";

type Media = { el: HTMLVideoElement | HTMLAudioElement; ready: boolean; url: string };

export class PreviewEngine {
  comp: Compositor;
  private media = new Map<string, Media>();
  private images = new Map<string, Frame | null>();
  private assets: Record<string, AssetView> = {};
  private info: Record<string, AssetInfo> = {};
  private handles = new Map<string, number>(); // extra seconds needed past clip end (transitions)
  onFrame?: () => void;

  constructor() {
    this.comp = new Compositor({
      createCanvas: (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; },
      assets: this.info,
      image: id => this.getImage(id),
      videoFrame: (item) => {
        const m = this.media.get(item.id);
        if (!m || !m.ready || !(m.el instanceof HTMLVideoElement) || m.el.readyState < 2) return null;
        return { image: m.el, width: m.el.videoWidth, height: m.el.videoHeight };
      },
    });
  }

  setAssets(assets: Record<string, AssetView>) {
    this.assets = assets;
    for (const k of Object.keys(this.info)) delete this.info[k];
    for (const a of Object.values(assets)) this.info[a.id] = { id: a.id, kind: a.kind, width: a.width, height: a.height, duration: a.duration, hasAudio: a.hasAudio, name: a.name };
  }

  private getImage(id: string): Frame | null {
    if (this.images.has(id)) return this.images.get(id)!;
    this.images.set(id, null);
    const a = this.assets[id];
    if (!a?.src) return null;
    const img = new Image();
    img.onload = () => { this.images.set(id, { image: img, width: img.naturalWidth, height: img.naturalHeight }); this.onFrame?.(); };
    img.src = a.src;
    return null;
  }

  /** Create/destroy media elements to match the timeline's clips. */
  sync(tl: Timeline) {
    const seen = new Set<string>();
    for (const tr of tl.tracks) {
      for (const it of tr.items) {
        if (it.type !== "video" && it.type !== "audio") continue;
        const a = this.assets[it.assetId];
        const url = it.type === "video" ? (a?.proxy || a?.src) : a?.src;
        if (!url) continue;
        seen.add(it.id);
        const ex = this.media.get(it.id);
        if (ex && ex.url === url) continue;
        ex?.el.pause();
        const el = it.type === "video" ? document.createElement("video") : document.createElement("audio");
        el.preload = "auto"; (el as any).playsInline = true; el.muted = false;
        el.src = url;
        const m: Media = { el, ready: false, url };
        el.addEventListener("loadeddata", () => { m.ready = true; this.onFrame?.(); });
        el.addEventListener("seeked", () => this.onFrame?.());
        el.load();
        this.media.set(it.id, m);
      }
    }
    for (const [id, m] of this.media) if (!seen.has(id)) { m.el.pause(); m.el.removeAttribute("src"); m.el.load(); this.media.delete(id); }
  }

  private volumeAt(c: VideoItem | AudioItem, t: number) {
    if ((c as VideoItem).muted) return 0;
    let v = c.volume;
    const rel = t - c.start;
    if (c.fadeIn > 0 && rel < c.fadeIn) v *= rel / c.fadeIn;
    if (c.fadeOut > 0 && c.duration - rel < c.fadeOut) v *= Math.max(0, c.duration - rel) / c.fadeOut;
    return Math.max(0, Math.min(1, v));
  }

  /**
   * Bring every media element to timeline time t. When `playing`, elements are started
   * at the right rate and only nudged when they drift; otherwise they're seeked.
   */
  update(tl: Timeline, t: number, playing: boolean, trackMuted: (trackId: string) => boolean, trackHidden: (trackId: string) => boolean) {
    for (const tr of tl.tracks) {
      for (const it of tr.items) {
        const m = this.media.get(it.id);
        if (!m) continue;
        const c = it as VideoItem | AudioItem;
        const handle = this.handles.get(it.id) || 0;
        const active = t >= c.start - 1e-3 && t < itemEnd(c) + handle;
        const audible = active && !trackMuted(tr.id) && t < itemEnd(c);
        const el = m.el;
        if (!active || (tr.hidden && it.type === "video" && !audible)) {
          if (!el.paused) el.pause();
          continue;
        }
        const want = sourceTime(c, t);
        el.volume = audible ? this.volumeAt(c, t) : 0;
        el.muted = !audible;
        if (playing) {
          if (el.playbackRate !== c.speed) { try { el.playbackRate = Math.min(16, Math.max(0.0625, c.speed)); } catch { /* unsupported rate */ } }
          if (Math.abs(el.currentTime - want) > 0.12) el.currentTime = want;
          if (el.paused) el.play().catch(() => {});
        } else {
          if (!el.paused) el.pause();
          if (Math.abs(el.currentTime - want) > 0.02) el.currentTime = want;
        }
      }
    }
    // Pre-roll: seek clips that start within the next second so they're ready.
    if (playing) {
      for (const tr of tl.tracks) for (const it of tr.items) {
        const m = this.media.get(it.id); if (!m) continue;
        const c = it as VideoItem | AudioItem;
        if (c.start > t && c.start - t < 1 && m.el.paused && Math.abs(m.el.currentTime - c.in) > 0.05) m.el.currentTime = c.in;
      }
    }
    void trackHidden;
  }

  setHandles(tl: Timeline) {
    this.handles.clear();
    for (const tr of tl.tracks) {
      const items = [...tr.items].sort((a, b) => a.start - b.start);
      for (let k = 0; k < items.length - 1; k++) {
        const n = items[k + 1] as VideoItem;
        if (n.type === "video" && n.transition && n.transition.type !== "none" && Math.abs(n.start - itemEnd(items[k])) < 0.05) this.handles.set(items[k].id, n.transition.duration);
      }
    }
  }

  /** True when all media needed at time t has a decodable frame. */
  ready(tl: Timeline, t: number) {
    for (const tr of tl.tracks) for (const it of tr.items) {
      if (it.type !== "video" || !isActive(it, t)) continue;
      const m = this.media.get(it.id);
      if (m && (!m.ready || (m.el as HTMLVideoElement).readyState < 2)) return false;
    }
    return true;
  }

  pauseAll() { for (const m of this.media.values()) m.el.pause(); }
  destroy() { for (const m of this.media.values()) { m.el.pause(); m.el.removeAttribute("src"); } this.media.clear(); }

  draw(ctx: CanvasRenderingContext2D, tl: Timeline, t: number) { this.comp.render(ctx, tl, t); }
  duration(tl: Timeline) { return totalDuration(tl); }
  hasMedia(it: Item) { return this.media.has(it.id); }
}
