"use client";
/** Multi-track timeline: ruler, filmstrips, waveforms, drag/trim, playhead, zoom. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@/lib/editor/store";
import { findItem, itemEnd, totalDuration, fmtTime, overlaps } from "@/lib/editor/timeline";
import type { AssetView } from "@/lib/studio";
import type { Item, Track, VideoItem, AudioItem } from "@/lib/editor/types";
import { IconBtn } from "./controls";

const HEAD_W = 120;
const TRACK_H: Record<string, number> = { video: 64, overlay: 48, text: 36, caption: 36, effect: 32, audio: 44 };
const COLORS: Record<string, string> = { video: "#3a2a6a", overlay: "#2a3f6a", text: "#5a3a1a", caption: "#1f4a3a", effect: "#5a2a4a", audio: "#1a4a5a" };

export default function Timeline() {
  const tl = useEditor(s => s.timeline);
  const assets = useEditor(s => s.assets);
  const time = useEditor(s => s.time);
  const zoom = useEditor(s => s.zoom);
  const selectedId = useEditor(s => s.selectedId);
  const { seek, setZoom, select, moveItem, updateItem, commit, splitAtPlayhead, removeItem, duplicateItem, updateTrack, undo, redo, setPlaying } = useEditor.getState();
  const scroller = useRef<HTMLDivElement>(null);
  const total = Math.max(totalDuration(tl), 5);
  const width = total * zoom + 400;

  // Follow the playhead while playing.
  const playing = useEditor(s => s.playing);
  useEffect(() => {
    const el = scroller.current; if (!el || !playing) return;
    const x = time * zoom;
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 80) el.scrollLeft = Math.max(0, x - 100);
  }, [time, zoom, playing]);

  function timeAt(clientX: number) {
    const el = scroller.current!; const r = el.getBoundingClientRect();
    return Math.max(0, (clientX - r.left - HEAD_W + el.scrollLeft) / zoom);
  }

  // Scrub on the ruler.
  const scrubbing = useRef(false);
  function rulerDown(e: React.PointerEvent) { scrubbing.current = true; (e.target as Element).setPointerCapture(e.pointerId); setPlaying(false); seek(timeAt(e.clientX)); }
  function rulerMove(e: React.PointerEvent) { if (scrubbing.current) seek(timeAt(e.clientX)); }
  function rulerUp() { scrubbing.current = false; }

  // Item drag (move / trim).
  const drag = useRef<{ id: string; mode: "move" | "l" | "r"; x0: number; item: Item; trackId: string; grab: number } | null>(null);
  const [hoverTrack, setHoverTrack] = useState<string | null>(null);
  function itemDown(e: React.PointerEvent, item: Item, track: Track, mode: "move" | "l" | "r") {
    e.stopPropagation();
    if (track.locked) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    select(item.id);
    drag.current = { id: item.id, mode, x0: e.clientX, item: JSON.parse(JSON.stringify(item)), trackId: track.id, grab: timeAt(e.clientX) - item.start };
  }
  function itemMove(e: React.PointerEvent) {
    const d = drag.current; if (!d) return;
    const dt = (e.clientX - d.x0) / zoom;
    const snap = (t: number) => {
      if (e.altKey) return t;
      const cands = [time, 0, ...tl.tracks.flatMap(tr => tr.items.filter(i => i.id !== d.id).flatMap(i => [i.start, itemEnd(i)]))];
      for (const c of cands) if (Math.abs(c - t) * zoom < 8) return c;
      return t;
    };
    if (d.mode === "move") {
      // Which track is under the pointer?
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-track]") as HTMLElement | null;
      const tid = el?.dataset.track;
      setHoverTrack(tid || null);
      const start = snap(Math.max(0, timeAt(e.clientX) - d.grab));
      moveItem(d.id, start, tid && tid !== d.trackId ? tid : undefined);
      if (tid && tid !== d.trackId) { const f = findItem(useEditor.getState().timeline, d.id); if (f) d.trackId = f.track.id; }
      return;
    }
    const it = d.item;
    const src = it.type === "video" || it.type === "audio" ? (it as VideoItem | AudioItem) : null;
    const asset = src ? assets[src.assetId] : null;
    if (d.mode === "l") {
      let ns = snap(it.start + dt);
      ns = Math.max(0, Math.min(ns, itemEnd(it) - 0.1));
      if (src && asset?.duration != null) ns = Math.max(ns, it.start - src.in / src.speed);
      const delta = ns - it.start;
      const patch: any = { start: ns, duration: it.duration - delta };
      if (src) patch.in = src.in + delta * src.speed;
      if ((it as any).keyframes) patch.keyframes = shiftKf((it as any).keyframes, -delta);
      if (it.type === "caption") patch.words = it.words.map(w => ({ ...w, start: w.start - delta, end: w.end - delta }));
      const track = findItem(tl, d.id)?.track;
      if (track && overlaps(track, { id: d.id, start: patch.start, duration: patch.duration })) return;
      updateItem(d.id, patch, true);
    } else {
      let ne = snap(itemEnd(it) + dt);
      ne = Math.max(it.start + 0.1, ne);
      if (src && asset?.duration != null) ne = Math.min(ne, it.start + (asset.duration - src.in) / src.speed);
      const track = findItem(tl, d.id)?.track;
      if (track && overlaps(track, { id: d.id, start: it.start, duration: ne - it.start })) return;
      updateItem(d.id, { duration: ne - it.start }, true);
    }
  }
  function itemUp() { drag.current = null; setHoverTrack(null); }

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;
      const st = useEditor.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === "Space") { e.preventDefault(); if (!st.playing && st.time >= totalDuration(st.timeline) - 0.01) seek(0); setPlaying(!st.playing); }
      else if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === "d" && st.selectedId) { e.preventDefault(); duplicateItem(st.selectedId); }
      else if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); splitAtPlayhead(); }
      else if (e.key === "s" && !mod) { splitAtPlayhead(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && st.selectedId) { e.preventDefault(); removeItem(st.selectedId); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); seek(st.time - (e.shiftKey ? 1 : 1 / st.timeline.canvas.fps)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); seek(st.time + (e.shiftKey ? 1 : 1 / st.timeline.canvas.fps)); }
      else if (e.key === "Home") seek(0);
      else if (e.key === "End") seek(totalDuration(st.timeline));
      else if (e.key === "Escape") select(null);
      else if (e.key === "=" || e.key === "+") setZoom(st.zoom * 1.25);
      else if (e.key === "-") setZoom(st.zoom / 1.25);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seek, setPlaying, undo, redo, duplicateItem, splitAtPlayhead, removeItem, select, setZoom]);

  // Ctrl+wheel zoom.
  function onWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }
  }

  const ticks = useMemo(() => {
    const step = zoom > 200 ? 0.5 : zoom > 90 ? 1 : zoom > 40 ? 2 : zoom > 18 ? 5 : zoom > 8 ? 10 : 30;
    const out: number[] = [];
    for (let t = 0; t <= total + 5; t += step) out.push(t);
    return out;
  }, [zoom, total]);

  const canSplit = tl.tracks.some(t => t.items.some(i => time > i.start + 0.02 && time < itemEnd(i) - 0.02));

  return (
    <div className="st-timeline">
      <div className="st-tl-toolbar">
        <IconBtn onClick={undo} title="Undo (⌘Z)">↶</IconBtn>
        <IconBtn onClick={redo} title="Redo (⌘⇧Z)">↷</IconBtn>
        <span className="st-tl-sep" />
        <IconBtn onClick={splitAtPlayhead} title="Split at playhead (S)" disabled={!canSplit}>✂ Split</IconBtn>
        <IconBtn onClick={() => selectedId && duplicateItem(selectedId)} title="Duplicate (⌘D)" disabled={!selectedId}>⧉</IconBtn>
        <IconBtn onClick={() => selectedId && removeItem(selectedId)} title="Delete" disabled={!selectedId} danger>🗑</IconBtn>
        <span className="st-tl-sep" />
        <span className="st-tl-time">{fmtTime(time, true, tl.canvas.fps)}</span>
        <span style={{ flex: 1 }} />
        <IconBtn onClick={() => setZoom(zoom / 1.3)} title="Zoom out (-)">−</IconBtn>
        <input type="range" min={8} max={600} value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: 110 }} />
        <IconBtn onClick={() => setZoom(zoom * 1.3)} title="Zoom in (+)">+</IconBtn>
        <IconBtn onClick={() => { const el = scroller.current; if (el) setZoom((el.clientWidth - HEAD_W - 40) / Math.max(1, totalDuration(tl))); }} title="Fit">Fit</IconBtn>
      </div>
      <div className="st-tl-scroll" ref={scroller} onWheel={onWheel} onPointerMove={itemMove} onPointerUp={itemUp} onPointerCancel={itemUp}>
        <div className="st-tl-inner" style={{ width: width + HEAD_W }}>
          <div className="st-tl-ruler" style={{ paddingLeft: HEAD_W }} onPointerDown={rulerDown} onPointerMove={rulerMove} onPointerUp={rulerUp}>
            {ticks.map(t => <div key={t} className="st-tick" style={{ left: HEAD_W + t * zoom }}><span>{fmtTime(t)}</span></div>)}
          </div>
          {tl.tracks.map(track => (
            <div key={track.id} className={`st-track ${hoverTrack === track.id ? "hover" : ""}`} style={{ height: TRACK_H[track.kind] }} data-track={track.id}
              onPointerDown={e => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("st-track-lane")) { select(null); setPlaying(false); seek(timeAt(e.clientX)); } }}>
              <div className="st-track-head" onPointerDown={e => e.stopPropagation()}>
                <span className="st-track-name">{track.name}</span>
                <span className="st-track-btns">
                  {track.kind !== "audio" && track.kind !== "effect" && <button className={track.hidden ? "off" : ""} onClick={() => updateTrack(track.id, { hidden: !track.hidden })} title="Show/hide">👁</button>}
                  {(track.kind === "video" || track.kind === "audio" || track.kind === "overlay") && <button className={track.muted ? "off" : ""} onClick={() => updateTrack(track.id, { muted: !track.muted })} title="Mute">🔊</button>}
                  <button className={track.locked ? "on" : ""} onClick={() => updateTrack(track.id, { locked: !track.locked })} title="Lock">🔒</button>
                  {!track.items.length && tl.tracks.filter(t => t.kind === track.kind).length > 1 && <button onClick={() => commit(t => { t.tracks = t.tracks.filter(x => x.id !== track.id); })} title="Remove empty track">✕</button>}
                </span>
              </div>
              <div className="st-track-lane" style={{ left: HEAD_W, width }}>
                {track.items.map(item => (
                  <TimelineItem key={item.id} item={item} track={track} zoom={zoom} h={TRACK_H[track.kind]} selected={item.id === selectedId} asset={"assetId" in item ? assets[(item as any).assetId] : undefined}
                    onDown={(e, mode) => itemDown(e, item, track, mode)} onDouble={() => { seek(item.start); }} />
                ))}
              </div>
            </div>
          ))}
          <div className="st-playhead" style={{ left: HEAD_W + time * zoom }} />
        </div>
      </div>
    </div>
  );
}

function shiftKf(kf: any, delta: number) {
  const out: any = {};
  for (const [p, list] of Object.entries(kf)) out[p] = (list as any[]).map(k => ({ ...k, t: Math.max(0, k.t + delta) }));
  return out;
}

function TimelineItem({ item, track, zoom, h, selected, asset, onDown, onDouble }: {
  item: Item; track: Track; zoom: number; h: number; selected: boolean; asset?: AssetView;
  onDown: (e: React.PointerEvent, mode: "move" | "l" | "r") => void; onDouble: () => void;
}) {
  const w = Math.max(6, item.duration * zoom);
  const label = item.type === "text" ? item.text : item.type === "caption" ? item.words.map(w => w.text).join(" ") : item.type === "sticker" ? (item.emoji || asset?.name || "Sticker")
    : item.type === "effect" ? item.effect : (asset?.name || item.label || item.type);
  const src = item.type === "video" || item.type === "audio" ? (item as VideoItem | AudioItem) : null;
  const trackIsVideo = track.kind === "video" || track.kind === "overlay";
  const tinfo = asset?.thumbsInfo;
  // Filmstrip: repeat the sprite so thumbnails line up with source time.
  const strip = useMemo(() => {
    if (!src || !asset?.thumbs || !tinfo || item.type !== "video") return null;
    const thumbH = h - 18, thumbW = thumbH * (tinfo.tw / tinfo.th);
    const secPerThumb = thumbW / zoom * src.speed; // source seconds spanned by one thumb width
    const n = Math.ceil(w / thumbW) + 1;
    const cells: { left: number; bx: number; by: number }[] = [];
    for (let k = 0; k < n; k++) {
      const st = src.in + k * secPerThumb;
      const idx = Math.min(tinfo.count - 1, Math.floor(st / tinfo.interval));
      cells.push({ left: k * thumbW, bx: (idx % tinfo.cols) * thumbW, by: Math.floor(idx / tinfo.cols) * thumbH });
    }
    return { cells, thumbW, thumbH, sheetW: thumbW * tinfo.cols, sheetH: thumbH * tinfo.rows };
  }, [src, asset, tinfo, zoom, w, h, item.type]);

  return (
    <div className={`st-item ${selected ? "sel" : ""} kind-${item.type}`} style={{ left: item.start * zoom, width: w, height: h - 8, background: COLORS[track.kind] }}
      onPointerDown={e => onDown(e, "move")} onDoubleClick={onDouble} title={label}>
      {strip && (
        <div className="st-strip" style={{ height: strip.thumbH }}>
          {strip.cells.map((c, k) => <div key={k} style={{ position: "absolute", left: c.left, width: strip.thumbW, height: strip.thumbH, backgroundImage: `url(${asset!.thumbs})`, backgroundSize: `${strip.sheetW}px ${strip.sheetH}px`, backgroundPosition: `-${c.bx}px -${c.by}px` }} />)}
        </div>
      )}
      {src && asset?.wave && <Wave url={asset.wave} inPoint={src.in} speed={src.speed} zoom={zoom} width={w} height={trackIsVideo ? 14 : h - 24} bottom={trackIsVideo} />}
      <div className="st-item-label">
        {item.type === "video" && item.transition && item.transition.type !== "none" && <span className="st-trans">⇄</span>}
        {src && src.speed !== 1 && <span className="st-badge">{src.speed}×</span>}
        {(item as any).keyframes && Object.keys((item as any).keyframes).length > 0 && <span className="st-badge">◆</span>}
        {label}
      </div>
      {!track.locked && <><div className="st-trim l" onPointerDown={e => onDown(e, "l")} /><div className="st-trim r" onPointerDown={e => onDown(e, "r")} /></>}
    </div>
  );
}

const waveCache = new Map<string, Promise<{ rate: number; peaks: Uint8Array }>>();
function Wave({ url, inPoint, speed, zoom, width, height, bottom }: { url: string; inPoint: number; speed: number; zoom: number; width: number; height: number; bottom: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!waveCache.has(url)) waveCache.set(url, fetch(url).then(r => r.json()).then(j => ({ rate: j.rate, peaks: Uint8Array.from(atob(j.peaks), c => c.charCodeAt(0)) })));
    let dead = false;
    waveCache.get(url)!.then(({ rate, peaks }) => {
      const c = ref.current; if (!c || dead) return;
      const W = Math.ceil(width), H = height;
      c.width = W; c.height = H;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let x = 0; x < W; x++) {
        const t0 = inPoint + (x / zoom) * speed, t1 = inPoint + ((x + 1) / zoom) * speed;
        let m = 0;
        for (let k = Math.floor(t0 * rate); k <= Math.floor(t1 * rate) && k < peaks.length; k++) m = Math.max(m, peaks[k]);
        const hh = Math.max(1, (m / 255) * H);
        ctx.fillRect(x, bottom ? H - hh : (H - hh) / 2, 1, hh);
      }
    }).catch(() => {});
    return () => { dead = true; };
  }, [url, inPoint, speed, zoom, width, height, bottom]);
  return <canvas ref={ref} className="st-wave" style={{ height, bottom: bottom ? 0 : undefined, top: bottom ? undefined : 4 }} />;
}
