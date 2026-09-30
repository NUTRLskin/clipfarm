"use client";
/** Canvas preview with drag/scale/rotate handles and the facecam-rect editor. */
import { useEffect, useMemo, useRef, useState } from "react";
import { PreviewEngine } from "@/lib/editor/preview";
import { useEditor } from "@/lib/editor/store";
import { findItem, totalDuration, isActive } from "@/lib/editor/timeline";
import { clampCrop, FONTS } from "@/lib/editor/presets";
import type { VisualItem, VideoItem } from "@/lib/editor/types";

export function usePreviewEngine() {
  const ref = useRef<PreviewEngine | null>(null);
  if (!ref.current && typeof window !== "undefined") ref.current = new PreviewEngine();
  return ref.current!;
}

export default function Preview({ engine }: { engine: PreviewEngine }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const tl = useEditor(s => s.timeline);
  const assets = useEditor(s => s.assets);
  const time = useEditor(s => s.time);
  const playing = useEditor(s => s.playing);
  const selectedId = useEditor(s => s.selectedId);
  const faceEditing = useEditor(s => s.faceRectEditing);
  const { seek, setPlaying, select, updateItem, commit } = useEditor.getState();
  const [size, setSize] = useState({ w: 270, h: 480 });
  const [, bump] = useState(0);

  // Fit the canvas into its box, keeping 9:16.
  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const ar = tl.canvas.width / tl.canvas.height;
      let w = r.width, h = w / ar;
      if (h > r.height) { h = r.height; w = h * ar; }
      setSize({ w: Math.floor(w), h: Math.floor(h) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [tl.canvas.width, tl.canvas.height]);

  useEffect(() => { engine.setAssets(assets); engine.sync(tl); engine.setHandles(tl); bump(n => n + 1); }, [engine, assets, tl]);
  useEffect(() => { engine.onFrame = () => bump(n => n + 1); return () => { engine.onFrame = undefined; }; }, [engine]);
  // Make sure the bundled fonts are decoded before text is measured/drawn.
  useEffect(() => {
    const loads = FONTS.flatMap(f => Object.keys(f.files).map(w => document.fonts.load(`${w} 40px "${f.family}"`).catch(() => null)));
    Promise.all(loads).then(() => bump(n => n + 1));
  }, []);

  // Draw + playback clock.
  const last = useRef<number>(0);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const muted = (id: string) => !!tl.tracks.find(t => t.id === id)?.muted;
    const hidden = (id: string) => !!tl.tracks.find(t => t.id === id)?.hidden;
    const frame = (now: number) => {
      const st = useEditor.getState();
      let t = st.time;
      if (st.playing) {
        const dt = last.current ? (now - last.current) / 1000 : 0;
        last.current = now;
        if (engine.ready(tl, t)) t += dt;
        const end = totalDuration(tl);
        if (t >= end) { t = end; setPlaying(false); engine.pauseAll(); }
        if (t !== st.time) useEditor.setState({ time: t });
      } else last.current = 0;
      engine.update(tl, t, st.playing, muted, hidden);
      engine.draw(ctx, tl, t);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [engine, tl, setPlaying]);

  useEffect(() => { if (!playing) engine.pauseAll(); }, [playing, engine]);

  const scale = size.w / tl.canvas.width;
  const sel = selectedId ? findItem(tl, selectedId) : null;
  const selItem = sel && sel.item.type !== "effect" && sel.item.type !== "audio" && isActive(sel.item, time) ? (sel.item as VisualItem) : null;
  const bounds = useMemo(() => (selItem ? engine.comp.bounds(selItem, time, tl.canvas.width) : null), [engine, selItem, time, tl.canvas.width]);

  // ── Drag / scale / rotate ──────────────────────────────────────────────────
  const drag = useRef<{ mode: "move" | "scale" | "rotate"; id: string; sx: number; sy: number; tf: any; cx: number; cy: number; d0: number; a0: number } | null>(null);
  function onPointerDown(e: React.PointerEvent, mode: "move" | "scale" | "rotate") {
    if (!selItem || !bounds) return;
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const r = canvasRef.current!.getBoundingClientRect();
    const cx = r.left + bounds.x * scale, cy = r.top + bounds.y * scale;
    drag.current = { mode, id: selItem.id, sx: e.clientX, sy: e.clientY, tf: { ...selItem.transform }, cx, cy, d0: Math.hypot(e.clientX - cx, e.clientY - cy), a0: Math.atan2(e.clientY - cy, e.clientX - cx) };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current; if (!d) return;
    const st = useEditor.getState();
    const f = findItem(st.timeline, d.id); if (!f) return;
    const it = f.item as VisualItem;
    const kf = it.keyframes || {};
    const patchTf: Partial<typeof it.transform> = {};
    if (d.mode === "move") { patchTf.x = d.tf.x + (e.clientX - d.sx) / scale; patchTf.y = d.tf.y + (e.clientY - d.sy) / scale; }
    if (d.mode === "scale") { const dd = Math.hypot(e.clientX - d.cx, e.clientY - d.cy); patchTf.scale = Math.max(0.02, d.tf.scale * (dd / Math.max(1, d.d0))); }
    if (d.mode === "rotate") { const a = Math.atan2(e.clientY - d.cy, e.clientX - d.cx); let deg = d.tf.rotation + ((a - d.a0) * 180) / Math.PI; if (e.shiftKey) deg = Math.round(deg / 15) * 15; patchTf.rotation = deg; }
    // If the prop is keyframed, write a keyframe at the playhead instead of the base value.
    const kfPatch: any = {};
    for (const [p, v] of Object.entries(patchTf)) {
      if (kf[p as keyof typeof kf]?.length) {
        const rel = st.time - it.start;
        const list = [...kf[p as keyof typeof kf]!].filter(k => Math.abs(k.t - rel) > 1 / 60);
        list.push({ t: rel, v: v as number, ease: "easeInOut" }); list.sort((a, b) => a.t - b.t);
        kfPatch[p] = list;
      }
    }
    st.updateItem(d.id, { transform: { ...it.transform, ...patchTf }, ...(Object.keys(kfPatch).length ? { keyframes: { ...kf, ...kfPatch } } : {}) } as any, true);
  }
  function onPointerUp() { drag.current = null; }

  // Click on empty canvas: select the topmost item under the pointer.
  function onCanvasClick(e: React.MouseEvent) {
    if (faceEditing) return;
    const r = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
    let hit: string | null = null;
    for (const tr of tl.tracks) {
      if (tr.hidden || tr.locked || tr.kind === "audio" || tr.kind === "effect") continue;
      for (const it of tr.items) {
        if (!isActive(it, time)) continue;
        const b = engine.comp.bounds(it as VisualItem, time, tl.canvas.width);
        const dx = x - b.x, dy = y - b.y, a = (-b.rotation * Math.PI) / 180;
        const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
        if (Math.abs(lx) <= b.w / 2 && Math.abs(ly) <= b.h / 2) hit = it.id; // later tracks draw on top → last hit wins
      }
    }
    select(hit);
  }

  // ── Facecam rect editor ────────────────────────────────────────────────────
  const faceItem = faceEditing ? (findItem(tl, faceEditing)?.item as VideoItem | undefined) : undefined;
  const faceAsset = faceItem ? assets[faceItem.assetId] : null;
  const faceRect = faceItem ? tl.faceRects?.[faceItem.assetId] || { x: 0, y: 0, w: 0.28, h: 0.36 } : null;
  const faceDrag = useRef<{ mode: "move" | "size"; sx: number; sy: number; r: any } | null>(null);
  const faceBox = useMemo(() => {
    if (!faceAsset?.width || !faceAsset.height) return null;
    const ar = faceAsset.width / faceAsset.height; let w = size.w, h = w / ar; if (h > size.h * 0.6) { h = size.h * 0.6; w = h * ar; }
    return { w, h };
  }, [faceAsset, size]);
  function faceMove(e: React.PointerEvent) {
    const d = faceDrag.current; if (!d || !faceBox || !faceItem) return;
    const dx = (e.clientX - d.sx) / faceBox.w, dy = (e.clientY - d.sy) / faceBox.h;
    const r = d.mode === "move" ? { ...d.r, x: d.r.x + dx, y: d.r.y + dy } : { ...d.r, w: d.r.w + dx, h: d.r.h + dy };
    commit(t => { t.faceRects = { ...(t.faceRects || {}), [faceItem.assetId]: clampCrop(r) }; }, { merge: true });
  }

  return (
    <div className="st-preview" ref={boxRef}>
      <div className="st-preview-stage" style={{ width: size.w, height: size.h }} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <canvas ref={canvasRef} width={tl.canvas.width} height={tl.canvas.height} style={{ width: size.w, height: size.h }} onClick={onCanvasClick} />
        {bounds && selItem && !faceEditing && (
          <div className="st-sel" style={{ left: bounds.x * scale, top: bounds.y * scale, width: bounds.w * scale, height: bounds.h * scale, transform: `translate(-50%,-50%) rotate(${bounds.rotation}deg)` }}
            onPointerDown={e => onPointerDown(e, "move")}>
            {["nw", "ne", "sw", "se"].map(c => <div key={c} className={`st-handle ${c}`} onPointerDown={e => onPointerDown(e, "scale")} />)}
            <div className="st-rotate" onPointerDown={e => onPointerDown(e, "rotate")} title="Drag to rotate (hold Shift to snap)">↻</div>
          </div>
        )}
        {faceEditing && faceBox && faceRect && (
          <div className="st-face-editor" onPointerMove={faceMove} onPointerUp={() => { faceDrag.current = null; }}>
            <div className="st-face-frame" style={{ width: faceBox.w, height: faceBox.h }}>
              {faceAsset?.thumbs && <img src={faceAsset.thumbs} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "0 0", opacity: 0.9 }}
                onLoad={e => { const im = e.currentTarget; const info = faceAsset.thumbsInfo; if (info) { im.style.objectFit = "none"; im.style.objectPosition = "0 0"; im.style.width = `${faceBox.w * info.cols}px`; im.style.height = `${faceBox.h * info.rows}px`; im.parentElement!.style.overflow = "hidden"; } }} />}
              <div className="st-face-rect" style={{ left: faceRect.x * faceBox.w, top: faceRect.y * faceBox.h, width: faceRect.w * faceBox.w, height: faceRect.h * faceBox.h }}
                onPointerDown={e => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); faceDrag.current = { mode: "move", sx: e.clientX, sy: e.clientY, r: faceRect }; }}>
                <span>Facecam</span>
                <div className="st-handle se" onPointerDown={e => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); faceDrag.current = { mode: "size", sx: e.clientX, sy: e.clientY, r: faceRect }; }} />
              </div>
            </div>
            <div className="st-face-hint">Drag the box over the streamer&apos;s camera, then <button className="st-link" onClick={() => useEditor.getState().setFaceRectEditing(null)}>Done</button></div>
          </div>
        )}
        {!playing && Object.keys(assets).length === 0 && <div className="st-preview-empty">Import a clip from the VOD to get started</div>}
      </div>
      <div className="st-preview-bar">
        <button className="st-play" onClick={() => { const st = useEditor.getState(); if (!st.playing && st.time >= totalDuration(tl) - 0.01) seek(0); setPlaying(!st.playing); }}>{playing ? "❚❚" : "▶"}</button>
        <span className="st-time">{fmt(time)} / {fmt(totalDuration(tl))}</span>
        <span className="st-preview-note">Preview · exports at {tl.canvas.width}×{tl.canvas.height}</span>
      </div>
    </div>
  );
}

const fmt = (t: number) => { const m = Math.floor(t / 60), s = t % 60; return `${m}:${s.toFixed(1).padStart(4, "0")}`; };
