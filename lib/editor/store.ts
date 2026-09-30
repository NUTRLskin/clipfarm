"use client";
/** Editor state (zustand) with undo/redo, selection, playback and autosave. */
import { create } from "zustand";
import type { AssetView, JobView } from "@/lib/studio";
import type { AnimatableProp, Item, Timeline, Track, TrackKind, VisualItem } from "./types";
import { findItem, firstFreeSlot, itemEnd, newId, overlaps, ripple, splitItem, totalDuration, hasKeyframeAt, setKeyframe, removeKeyframeAt } from "./timeline";

export type Panel = "media" | "layouts" | "captions" | "text" | "stickers" | "audio" | "effects" | "filters" | "transitions" | "export";

type State = {
  projectId: string;
  title: string;
  timeline: Timeline;
  assets: Record<string, AssetView>;
  jobs: JobView[];
  campaign: { id: string; streamer: string; twitchUser: string; status: string } | null;
  /** Twitch channel the footage comes from — set for any project, campaign or not. */
  channel: { login: string; display: string; avatar: string | null } | null;
  tiktokConnected: boolean;
  past: Timeline[];
  future: Timeline[];
  selectedId: string | null;
  time: number;
  playing: boolean;
  zoom: number; // px per second
  panel: Panel;
  dirty: boolean;
  saving: boolean;
  savedAt: number | null;
  error: string | null;
  faceRectEditing: string | null;

  load(data: any): void;
  setAssets(assets: AssetView[], jobs: JobView[]): void;
  setTitle(t: string): void;
  select(id: string | null): void;
  seek(t: number): void;
  setPlaying(p: boolean): void;
  setZoom(z: number): void;
  setPanel(p: Panel): void;
  setError(e: string | null): void;
  setFaceRectEditing(id: string | null): void;
  /** Mutate the timeline through `fn` and push undo history. */
  commit(fn: (tl: Timeline) => Timeline | void, opts?: { merge?: boolean }): void;
  undo(): void;
  redo(): void;
  updateItem(id: string, patch: Partial<Item> | ((i: Item) => Partial<Item>), merge?: boolean): void;
  addItem(kind: TrackKind, item: Item, opts?: { at?: number; newTrack?: boolean }): string;
  removeItem(id: string): void;
  duplicateItem(id: string): void;
  splitAtPlayhead(): void;
  moveItem(id: string, start: number, trackId?: string): void;
  toggleKeyframe(id: string, prop: AnimatableProp): void;
  updateTrack(id: string, patch: Partial<Track>): void;
  markSaved(): void;
};

let mergeTimer: any = null;

export const useEditor = create<State>((set, get) => ({
  projectId: "", title: "", timeline: null as any, assets: {}, jobs: [], campaign: null, channel: null, tiktokConnected: false,
  past: [], future: [], selectedId: null, time: 0, playing: false, zoom: 60, panel: "media", dirty: false, saving: false,
  savedAt: null, error: null, faceRectEditing: null,

  load(data) {
    const assets: Record<string, AssetView> = {};
    for (const a of data.assets) assets[a.id] = a;
    set({ projectId: data.project.id, title: data.project.title, timeline: data.project.timeline, assets, jobs: data.jobs, campaign: data.campaign, channel: data.channel ?? null, past: [], future: [], dirty: false, selectedId: null, time: 0 });
  },
  setAssets(list, jobs) { const assets: Record<string, AssetView> = {}; for (const a of list) assets[a.id] = a; set({ assets, jobs }); },
  setTitle(title) { set({ title, dirty: true }); },
  select(selectedId) { set({ selectedId }); },
  seek(t) { const d = totalDuration(get().timeline); set({ time: Math.max(0, Math.min(t, Math.max(d, 0))) }); },
  setPlaying(playing) { set({ playing }); },
  setZoom(zoom) { set({ zoom: Math.max(8, Math.min(600, zoom)) }); },
  setPanel(panel) { set({ panel }); },
  setError(error) { set({ error }); },
  setFaceRectEditing(id) { set({ faceRectEditing: id }); },

  commit(fn, opts) {
    const { timeline, past } = get();
    const copy: Timeline = JSON.parse(JSON.stringify(timeline));
    const next = fn(copy) || copy;
    // Slider drags produce many commits — merge them into one undo step.
    const merging = opts?.merge && mergeTimer;
    if (opts?.merge) { clearTimeout(mergeTimer); mergeTimer = setTimeout(() => { mergeTimer = null; }, 600); }
    set({ timeline: next, past: merging ? past : [...past.slice(-80), timeline], future: [], dirty: true });
  },
  undo() { const { past, timeline, future } = get(); if (!past.length) return; set({ timeline: past[past.length - 1], past: past.slice(0, -1), future: [timeline, ...future], dirty: true }); },
  redo() { const { past, timeline, future } = get(); if (!future.length) return; set({ timeline: future[0], future: future.slice(1), past: [...past, timeline], dirty: true }); },

  updateItem(id, patch, merge) {
    get().commit(tl => {
      const f = findItem(tl, id); if (!f) return;
      const p = typeof patch === "function" ? patch(f.item) : patch;
      f.track.items[f.index] = { ...f.item, ...p } as Item;
    }, { merge });
  },

  addItem(kind, item, opts) {
    const id = item.id || newId(item.type[0]);
    get().commit(tl => {
      let track = opts?.newTrack ? undefined : tl.tracks.find(t => t.kind === kind && !t.locked && !overlaps(t, { ...item, id }));
      if (!track) {
        const kindCount = tl.tracks.filter(t => t.kind === kind).length;
        track = { id: newId("t"), kind, name: `${kind[0].toUpperCase()}${kind.slice(1)} ${kindCount + 1}`, items: [] };
        // Keep draw order sensible: video lowest, then overlays/text/captions, effects on top; audio at the end.
        const order: TrackKind[] = ["video", "overlay", "text", "caption", "effect", "audio"];
        let idx = tl.tracks.length;
        for (let k = tl.tracks.length - 1; k >= 0; k--) if (order.indexOf(tl.tracks[k].kind) <= order.indexOf(kind)) { idx = k + 1; break; }
        if (kind === "video" && !tl.tracks.some(t => t.kind === "video")) idx = 0;
        tl.tracks.splice(idx, 0, track);
      }
      const start = opts?.at ?? item.start;
      track.items.push({ ...item, id, start: firstFreeSlot(track, start, item.duration) } as Item);
    });
    set({ selectedId: id });
    return id;
  },

  removeItem(id) {
    get().commit(tl => {
      const f = findItem(tl, id); if (!f) return;
      f.track.items.splice(f.index, 1);
      if (f.track.kind === "video" && f.track === tl.tracks.find(t => t.kind === "video")) Object.assign(f.track, ripple(f.track));
    });
    if (get().selectedId === id) set({ selectedId: null });
  },

  duplicateItem(id) {
    const f = findItem(get().timeline, id); if (!f) return;
    const copy: Item = { ...JSON.parse(JSON.stringify(f.item)), id: newId(f.item.type[0]), start: itemEnd(f.item) };
    get().addItem(f.track.kind, copy);
  },

  splitAtPlayhead() {
    const { time, selectedId, timeline } = get();
    // With nothing selected, split the media clips under the playhead (not text/stickers).
    const targets = selectedId ? [selectedId] : timeline.tracks.flatMap(t => t.items.filter(i => (i.type === "video" || i.type === "audio") && time > i.start && time < itemEnd(i)).map(i => i.id));
    if (!targets.length) return;
    get().commit(tl => {
      for (const id of targets) {
        const f = findItem(tl, id); if (!f) continue;
        const r = splitItem(f.item, time); if (!r) continue;
        f.track.items.splice(f.index, 1, r[0], r[1]);
      }
    });
  },

  moveItem(id, start, trackId) {
    get().commit(tl => {
      const f = findItem(tl, id); if (!f) return;
      const dest = trackId ? tl.tracks.find(t => t.id === trackId) : f.track;
      if (!dest || dest.locked) return;
      if (dest !== f.track && dest.kind !== f.track.kind && !(["overlay", "video"].includes(dest.kind) && ["overlay", "video"].includes(f.track.kind))) return;
      const moved = { ...f.item, start: Math.max(0, start) };
      if (overlaps(dest, moved)) {
        // Snap to the nearest free slot instead of refusing.
        moved.start = firstFreeSlot(dest, moved.start, moved.duration);
      }
      f.track.items.splice(f.index, 1);
      dest.items.push(moved);
    }, { merge: true });
  },

  toggleKeyframe(id, prop) {
    const { time } = get();
    get().updateItem(id, i => {
      const v = i as VisualItem;
      return (hasKeyframeAt(v, prop, time) ? removeKeyframeAt(v, prop, time) : setKeyframe(v, prop, time, v.transform[prop])) as any;
    });
  },

  updateTrack(id, patch) { get().commit(tl => { const t = tl.tracks.find(t => t.id === id); if (t) Object.assign(t, patch); }); },
  markSaved() { set({ dirty: false, saving: false, savedAt: Date.now() }); },
}));

/** Selected item + its track. Selects stable references so zustand doesn't re-render in a loop. */
export function useSelected() {
  const item = useEditor(s => (s.selectedId ? findItem(s.timeline, s.selectedId)?.item ?? null : null));
  const track = useEditor(s => (s.selectedId ? findItem(s.timeline, s.selectedId)?.track ?? null : null));
  return item && track ? { item, track } : null;
}
