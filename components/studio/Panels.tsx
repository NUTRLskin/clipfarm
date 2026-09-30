"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor, type Panel } from "@/lib/editor/store";
import { buildCaptions, newId, totalDuration, fmtTime, removeSilences } from "@/lib/editor/timeline";
import { CAPTION_PRESETS, EFFECTS, EMOJIS, FULL_CROP, LAYOUTS, TEXT_PRESETS, TRANSITIONS, captionStyle, defaultFilter, defaultTextStyle, defaultTransform, layoutItems, DEFAULT_FACE_RECT, CANVAS_W, CANVAS_H, FILTER_PRESETS, applyFilterPreset } from "@/lib/editor/presets";
import type { AssetView, JobView } from "@/lib/studio";
import type { VideoItem, CaptionItem, Item } from "@/lib/editor/types";
import { Section, Spinner, Row, Slider } from "./controls";
import VodPicker from "./VodPicker";

export const PANELS: { id: Panel; name: string; icon: string }[] = [
  { id: "media", name: "Media", icon: "🎬" }, { id: "layouts", name: "Layout", icon: "▦" }, { id: "captions", name: "Captions", icon: "💬" },
  { id: "text", name: "Text", icon: "T" }, { id: "stickers", name: "Stickers", icon: "🔥" }, { id: "audio", name: "Audio", icon: "🎵" },
  { id: "effects", name: "Effects", icon: "✦" }, { id: "filters", name: "Filters", icon: "◐" }, { id: "transitions", name: "Transit.", icon: "⇄" }, { id: "export", name: "Export", icon: "⬆" },
];

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}

export function PanelBody({ panel, refresh }: { panel: Panel; refresh: () => Promise<void> }) {
  switch (panel) {
    case "media": return <MediaPanel refresh={refresh} />;
    case "layouts": return <LayoutsPanel />;
    case "captions": return <CaptionsPanel refresh={refresh} />;
    case "text": return <TextPanel />;
    case "stickers": return <StickersPanel refresh={refresh} />;
    case "audio": return <AudioPanel refresh={refresh} />;
    case "effects": return <EffectsPanel />;
    case "filters": return <FiltersPanel />;
    case "transitions": return <TransitionsPanel />;
    case "export": return <ExportPanel refresh={refresh} />;
  }
}

// ── Media ────────────────────────────────────────────────────────────────────
/** Opens (or reuses) the clipper's inbox thread with this project's streamer. */
function MessageStreamer({ login, name }: { login: string; name: string }) {
  const projectId = useEditor(s => s.projectId);
  const setError = useEditor(s => s.setError);
  const [busy, setBusy] = useState(false);
  return (
    <button className="st-btn" disabled={busy} onClick={async () => {
      setBusy(true);
      try { const t = await api("/api/inbox", { method: "POST", body: JSON.stringify({ streamerLogin: login, projectId }) }); window.location.href = `/inbox?thread=${t.id}`; }
      catch (e: any) { setError(e.message); setBusy(false); }
    }} title={`Message ${name} in your ClipFarm inbox`}>✉ Message {name}</button>
  );
}

function useUpload(refresh: () => Promise<void>) {
  const projectId = useEditor(s => s.projectId);
  const setError = useEditor(s => s.setError);
  const [busy, setBusy] = useState<string | null>(null);
  async function upload(file: File) {
    setBusy(file.name);
    try {
      const { asset, uploadUrl } = await api(`/api/projects/${projectId}/uploads`, { method: "POST", body: JSON.stringify({ name: file.name, type: file.type, size: file.size }) });
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Upload failed");
      await api(`/api/projects/${projectId}/uploads/${asset.id}`, { method: "POST" });
      await refresh();
      return asset as AssetView;
    } catch (e: any) { setError(e.message); return null; }
    finally { setBusy(null); }
  }
  return { upload, busy };
}

export function addVideoToTimeline(a: AssetView) {
  const st = useEditor.getState();
  const tl = st.timeline;
  const end = totalDuration(tl);
  const base: VideoItem = {
    id: newId("v"), type: "video", assetId: a.id, start: end, duration: a.duration || 5, in: 0, speed: 1, volume: 1, fadeIn: 0, fadeOut: 0,
    crop: FULL_CROP, filter: defaultFilter(), transform: defaultTransform(),
  };
  const info = { id: a.id, kind: a.kind, width: a.width, height: a.height, duration: a.duration, hasAudio: a.hasAudio };
  const isLandscape = (a.width || 16) > (a.height || 9);
  const [main] = layoutItems(isLandscape ? "fill" : "fit", base, info, DEFAULT_FACE_RECT, () => newId("v"));
  const mainTrack = tl.tracks.find(t => t.kind === "video");
  st.addItem("video", { ...main, id: base.id }, { at: mainTrack ? end : 0 });
  st.seek(end);
}

function MediaPanel({ refresh }: { refresh: () => Promise<void> }) {
  const assets = useEditor(s => s.assets);
  const jobs = useEditor(s => s.jobs);
  const campaign = useEditor(s => s.campaign);
  const channel = useEditor(s => s.channel);
  const projectId = useEditor(s => s.projectId);
  const setError = useEditor(s => s.setError);
  const { upload, busy } = useUpload(refresh);
  const [showVod, setShowVod] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const list = Object.values(assets).filter(a => a.kind !== "export");
  const jobFor = (id: string) => jobs.find(j => j.assetId === id && (j.status === "queued" || j.status === "running"));

  async function importRange(v: { vodId: string; start: number; end: number }) {
    try { await api(`/api/projects/${projectId}/import`, { method: "POST", body: JSON.stringify(v) }); setShowVod(false); await refresh(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="st-btn-row">
        <button className="st-btn primary" onClick={() => setShowVod(true)} disabled={!channel && !campaign}>＋ From {channel?.display || campaign?.streamer || "VOD"}&apos;s VODs</button>
        {(channel || campaign) && <MessageStreamer login={channel?.login || campaign!.twitchUser} name={channel?.display || campaign!.streamer} />}
        <button className="st-btn" onClick={() => fileRef.current?.click()}>Upload</button>
        <input ref={fileRef} type="file" hidden accept="video/*,image/*,audio/*" multiple onChange={async e => { for (const f of Array.from(e.target.files || [])) await upload(f); e.target.value = ""; }} />
      </div>
      {busy && <div className="st-hint" style={{ marginTop: 8 }}><Spinner /> Uploading {busy}…</div>}
      <div className="st-media-list">
        {list.length === 0 && <div className="st-empty">No media yet. Pull a moment from the stream VOD, or upload your own video, images or music.</div>}
        {list.map(a => {
          const job = jobFor(a.id);
          const pct = job ? Math.round(job.progress * 100) : 0;
          return (
            <div key={a.id} className={`st-media ${a.status}`} draggable={a.status === "ready"} onDragStart={e => e.dataTransfer.setData("asset", a.id)}>
              <div className="st-media-thumb" style={a.thumbs && a.thumbsInfo ? { backgroundImage: `url(${a.thumbs})`, backgroundSize: `${a.thumbsInfo.cols * 100}% auto`, backgroundPosition: "0 0" } : a.kind === "image" && a.src ? { backgroundImage: `url(${a.src})`, backgroundSize: "cover" } : {}}>
                {a.kind === "audio" && "🎵"}{a.kind === "image" && !a.src && "🖼"}
              </div>
              <div className="st-media-info">
                <div className="st-media-name">{a.name}</div>
                <div className="st-hint">
                  {a.status === "ready" && <>{a.duration != null ? fmtTime(a.duration) : ""}{a.width ? ` · ${a.width}×${a.height}` : ""}</>}
                  {(a.status === "pending" || a.status === "processing") && <><Spinner /> {job?.type === "ingest" ? (pct < 60 ? `Downloading ${pct}%` : `Processing ${pct}%`) : job ? `Processing ${pct}%` : a.status === "pending" ? "Waiting for worker…" : "Processing…"}</>}
                  {a.status === "failed" && <span className="st-err">{a.error || "Failed"}</span>}
                </div>
              </div>
              {a.status === "ready" && (a.kind === "vod" || a.kind === "video") && <button className="st-btn small" onClick={() => addVideoToTimeline(a)}>＋ Add</button>}
              {a.status === "ready" && a.kind === "image" && <button className="st-btn small" onClick={() => useEditor.getState().addItem("overlay", { id: newId("i"), type: "image", assetId: a.id, start: useEditor.getState().time, duration: 3, crop: FULL_CROP, filter: defaultFilter(), transform: defaultTransform(CANVAS_W / 2, CANVAS_H / 2, Math.min(1, 600 / (a.width || 600))), animIn: { type: "pop", duration: 0.3 } })}>＋ Add</button>}
              {a.status === "ready" && a.kind === "audio" && <button className="st-btn small" onClick={() => useEditor.getState().addItem("audio", { id: newId("a"), type: "audio", assetId: a.id, start: 0, duration: Math.min(a.duration || 30, Math.max(5, totalDuration(useEditor.getState().timeline))), in: 0, speed: 1, volume: 0.35, fadeIn: 0.5, fadeOut: 1 })}>＋ Add</button>}
              <button className="st-icon" title="Remove" onClick={async () => { if (!confirm("Remove this media from the project?")) return; await fetch(`/api/projects/${projectId}/assets/${a.id}`, { method: "DELETE" }); useEditor.getState().commit(t => { for (const tr of t.tracks) tr.items = tr.items.filter(i => (i as any).assetId !== a.id); }); await refresh(); }}>✕</button>
            </div>
          );
        })}
      </div>
      {showVod && (channel || campaign) && <VodPicker login={channel?.login || campaign!.twitchUser} streamer={channel?.display || campaign!.streamer} onClose={() => setShowVod(false)} onImport={importRange} />}
    </div>
  );
}

// ── Layouts ──────────────────────────────────────────────────────────────────
function LayoutsPanel() {
  const tl = useEditor(s => s.timeline);
  const assets = useEditor(s => s.assets);
  const selectedId = useEditor(s => s.selectedId);
  const { commit, setFaceRectEditing, select } = useEditor.getState();
  const mainTrack = tl.tracks.find(t => t.kind === "video");
  const clips = (mainTrack?.items.filter(i => i.type === "video") || []) as VideoItem[];
  const target = clips.find(c => c.id === selectedId) || clips.find(c => useEditor.getState().time >= c.start && useEditor.getState().time < c.start + c.duration) || clips[0];
  const [applyAll, setApplyAll] = useState(true);

  function apply(layout: typeof LAYOUTS[number]["id"]) {
    const targets = applyAll ? clips : target ? [target] : [];
    if (!targets.length) return;
    let needFace = false;
    commit(t => {
      const main = t.tracks.find(tr => tr.kind === "video")!;
      for (const clip of targets) {
        const a = assets[clip.assetId]; if (!a) continue;
        const face = t.faceRects?.[clip.assetId] || DEFAULT_FACE_RECT;
        if (!t.faceRects?.[clip.assetId] && (layout === "split" || layout === "split5050" || layout === "facecamCorner")) needFace = true;
        const items = layoutItems(layout, clip, { id: a.id, kind: a.kind, width: a.width, height: a.height, duration: a.duration, hasAudio: a.hasAudio }, face, () => newId("v"));
        for (const tr of t.tracks) if (tr.kind === "overlay") tr.items = tr.items.filter(i => !(i.type === "video" && i.assetId === clip.assetId && Math.abs(i.start - clip.start) < 0.01 && Math.abs(i.duration - clip.duration) < 0.01));
        main.items = main.items.map(i => i.id === clip.id ? items[0] : i);
        if (items[1]) {
          let ov = t.tracks.find(tr => tr.kind === "overlay" && !tr.items.some(o => items[1].start < o.start + o.duration && items[1].start + items[1].duration > o.start));
          if (!ov) { ov = { id: newId("t"), kind: "overlay", name: "Facecam", items: [] }; t.tracks.splice(t.tracks.indexOf(main) + 1, 0, ov); }
          ov.items.push(items[1]);
        }
      }
    });
    if (needFace && target) { select(target.id); setFaceRectEditing(target.id); }
  }

  return (
    <div>
      <div className="st-hint" style={{ marginBottom: 10 }}>Re-frame the 16:9 stream for vertical. Facecam layouts need the camera area marked once per source clip.</div>
      <label className="st-toggle" style={{ marginBottom: 10 }}><input type="checkbox" checked={applyAll} onChange={e => setApplyAll(e.target.checked)} /><span className="st-toggle-track"><span className="st-toggle-knob" /></span><span>Apply to all clips</span></label>
      <div className="st-grid2">
        {LAYOUTS.map(L => (
          <button key={L.id} className="st-tile tall" onClick={() => apply(L.id)} disabled={!clips.length}>
            <LayoutIcon id={L.id} /><b>{L.name}</b><span>{L.hint}</span>
          </button>
        ))}
      </div>
      {target && <button className="st-btn" style={{ marginTop: 10 }} onClick={() => { select(target.id); setFaceRectEditing(target.id); }}>Mark facecam area…</button>}
      {!clips.length && <div className="st-empty">Add a clip first.</div>}
    </div>
  );
}
function LayoutIcon({ id }: { id: string }) {
  const box = (x: number, y: number, w: number, h: number, k: number, r = 2) => <rect key={k} x={x} y={y} width={w} height={h} rx={r} fill="var(--purple)" opacity={k ? 0.55 : 0.9} />;
  const parts: React.ReactNode[] = [];
  if (id === "fill") parts.push(box(2, 2, 32, 56, 0));
  if (id === "fit") { parts.push(<rect key="b" x={2} y={2} width={32} height={56} rx={2} fill="var(--bg4)" />); parts.push(box(2, 21, 32, 18, 0, 0)); }
  if (id === "split") { parts.push(box(2, 2, 32, 20, 1, 0)); parts.push(box(2, 22, 32, 36, 0, 0)); }
  if (id === "split5050") { parts.push(box(2, 2, 32, 27, 1, 0)); parts.push(box(2, 31, 32, 27, 0, 0)); }
  if (id === "facecamCorner") { parts.push(box(2, 2, 32, 56, 0)); parts.push(<rect key="c" x={19} y={6} width={13} height={13} rx={4} fill="#fff" opacity={0.9} />); }
  if (id === "gameplay") { parts.push(box(2, 2, 32, 56, 0)); parts.push(<circle key="z" cx={18} cy={30} r={8} fill="none" stroke="#fff" strokeWidth={2} opacity={0.8} />); }
  return <svg width={36} height={60} viewBox="0 0 36 60">{parts}</svg>;
}

// ── Captions ─────────────────────────────────────────────────────────────────
function CaptionsPanel({ refresh }: { refresh: () => Promise<void> }) {
  const tl = useEditor(s => s.timeline);
  const assets = useEditor(s => s.assets);
  const jobs = useEditor(s => s.jobs);
  const projectId = useEditor(s => s.projectId);
  const setError = useEditor(s => s.setError);
  const { commit } = useEditor.getState();
  const [preset, setPreset] = useState("bold");
  const [y, setY] = useState(1400);
  const [words, setWords] = useState(3);
  const [busy, setBusy] = useState(false);
  const [gap, setGap] = useState(0.8);
  const [tightened, setTightened] = useState<number | null>(null);
  const clips = tl.tracks.filter(t => t.kind === "video").flatMap(t => t.items.filter(i => i.type === "video") as VideoItem[]);
  const srcIds = [...new Set(clips.map(c => c.assetId))];
  const missing = srcIds.filter(id => assets[id] && !assets[id].hasTranscript);
  const transcribing = jobs.filter(j => j.type === "transcribe" && (j.status === "queued" || j.status === "running"));
  const existing = tl.tracks.filter(t => t.kind === "caption").reduce((n, t) => n + t.items.length, 0);

  async function ensureTranscripts(): Promise<Record<string, any[]>> {
    for (const id of missing) await api(`/api/projects/${projectId}/transcribe`, { method: "POST", body: JSON.stringify({ assetId: id }) });
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
      await refresh();
      const st = useEditor.getState();
      const failed = st.jobs.find(j => j.type === "transcribe" && j.status === "failed" && Date.now() - new Date(j.createdAt).getTime() < 60_000);
      if (failed) throw new Error(failed.error || "Transcription failed");
      if (srcIds.every(id => st.assets[id]?.hasTranscript)) break;
      await new Promise(r => setTimeout(r, 2500));
    }
    const transcripts: Record<string, any[]> = {};
    for (const id of srcIds) transcripts[id] = (await api(`/api/projects/${projectId}/assets/${id}`)).transcript || [];
    return transcripts;
  }

  /** CapCut-style "remove silences": cut pauses longer than `gap` out of every clip, then rebuild captions if there were any. */
  async function tighten() {
    setBusy(true); setTightened(null);
    try {
      const transcripts = await ensureTranscripts();
      const st = useEditor.getState();
      const { tl: next, removed } = removeSilences(st.timeline, transcripts, { minGap: gap, pad: 0.12 });
      if (removed <= 0) { setTightened(0); return; }
      const hadCaptions = existing > 0;
      commit(() => {
        if (hadCaptions) for (const tr of next.tracks) if (tr.kind === "caption") tr.items = [];
        return next;
      });
      if (hadCaptions) {
        const st2 = useEditor.getState();
        const clips2 = st2.timeline.tracks.filter(t => t.kind === "video").flatMap(t => t.items.filter(i => i.type === "video") as VideoItem[]);
        const items = buildCaptions(clips2, transcripts, captionStyle(preset, { wordsPerChunk: words }), { transform: defaultTransform(CANVAS_W / 2, y) });
        commit(t => { const track = t.tracks.find(tr => tr.kind === "caption"); if (track) track.items = items; }, { merge: true });
      }
      setTightened(removed);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function generate() {
    setBusy(true);
    try {
      for (const id of missing) await api(`/api/projects/${projectId}/transcribe`, { method: "POST", body: JSON.stringify({ assetId: id }) });
      // Poll until transcripts are ready.
      const deadline = Date.now() + 10 * 60_000;
      while (Date.now() < deadline) {
        await refresh();
        const st = useEditor.getState();
        const failed = st.jobs.find(j => j.type === "transcribe" && j.status === "failed" && Date.now() - new Date(j.createdAt).getTime() < 60_000);
        if (failed) throw new Error(failed.error || "Transcription failed");
        if (srcIds.every(id => st.assets[id]?.hasTranscript)) break;
        await new Promise(r => setTimeout(r, 2500));
      }
      const transcripts: Record<string, any[]> = {};
      for (const id of srcIds) transcripts[id] = (await api(`/api/projects/${projectId}/assets/${id}`)).transcript || [];
      const style = captionStyle(preset, { wordsPerChunk: words });
      const items = buildCaptions(clips, transcripts, style, { transform: defaultTransform(CANVAS_W / 2, y) });
      if (!items.length) throw new Error("No speech detected in the clips");
      commit(t => {
        let track = t.tracks.find(tr => tr.kind === "caption");
        if (!track) { track = { id: newId("t"), kind: "caption", name: "Captions", items: [] }; t.tracks.push(track); }
        track.items = items;
      });
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="st-hint" style={{ marginBottom: 10 }}>Word-by-word animated captions generated from the clip audio. Edit any word by selecting the caption on the timeline.</div>
      <Section title="Style">
        <div className="st-caption-presets">
          {CAPTION_PRESETS.map(p => { const s = captionStyle(p.id); return (
            <button key={p.id} className={preset === p.id ? "on" : ""} onClick={() => setPreset(p.id)}>
              <span style={{ fontFamily: `"${s.font}"`, fontWeight: s.weight, color: s.color, WebkitTextStroke: s.strokeWidth ? `1px ${s.strokeColor}` : undefined, textTransform: s.uppercase ? "uppercase" : "none", background: s.bgColor, borderRadius: 4, padding: "0 4px" }}>
                {p.id === "one-word" ? "WOW" : <>this is <span style={{ color: s.highlight === "none" ? s.color : s.activeColor, background: s.highlight === "box" ? s.activeBg : undefined, borderRadius: 3, padding: "0 2px" }}>insane</span></>}
              </span>
              <small>{p.name}</small>
            </button>); })}
        </div>
        <Row label="Words / line"><Slider value={words} min={1} max={8} step={1} onChange={setWords} format={v => `${v}`} /></Row>
        <Row label="Position"><Slider value={y} min={200} max={1800} step={10} onChange={setY} format={v => `${Math.round(v)}px`} /></Row>
      </Section>
      <button className="st-btn primary" style={{ width: "100%" }} disabled={busy || !clips.length || transcribing.length > 0} onClick={generate}>
        {busy || transcribing.length ? <><Spinner /> {missing.length ? "Transcribing…" : "Building captions…"}</> : existing ? "Regenerate captions" : "✨ Auto captions"}
      </button>
      {!clips.length && <div className="st-empty">Add a clip first.</div>}
      {existing > 0 && <div className="st-btn-row" style={{ marginTop: 8 }}>
        <button className="st-btn" onClick={() => commit(t => { for (const tr of t.tracks) if (tr.kind === "caption") tr.items = []; })}>Clear captions</button>
        <button className="st-btn" onClick={() => commit(t => { for (const tr of t.tracks) for (const i of tr.items) if (i.type === "caption") i.transform.y = y; })}>Move all to position</button>
      </div>}
      <Section title="Remove silences" right={<span className="st-hint">tighten pacing</span>}>
        <Row label="Pauses over"><Slider value={gap} min={0.3} max={2.5} step={0.1} onChange={setGap} format={v => `${v.toFixed(1)}s`} /></Row>
        <button className="st-btn" style={{ width: "100%" }} disabled={busy || !clips.length || transcribing.length > 0} onClick={tighten}>
          {busy ? <><Spinner /> Working…</> : "✂ Cut dead air"}
        </button>
        <div className="st-hint" style={{ marginTop: 6 }}>
          {tightened == null ? "Cuts every pause longer than the threshold out of your clips and closes the gaps. Captions are rebuilt automatically."
            : tightened === 0 ? "No pauses that long — nothing to cut." : `Removed ${tightened}s of dead air. Undo with ⌘Z if it's too tight.`}
        </div>
      </Section>
      <Section title="Manual caption">
        <button className="st-btn" onClick={() => {
          const st = useEditor.getState();
          const item: CaptionItem = { id: newId("c"), type: "caption", start: st.time, duration: 2, words: [{ text: "your", start: 0, end: 0.4 }, { text: "text", start: 0.4, end: 0.8 }, { text: "here", start: 0.8, end: 1.2 }], style: captionStyle(preset, { wordsPerChunk: words }), transform: defaultTransform(CANVAS_W / 2, y) };
          st.addItem("caption", item);
        }}>＋ Add a caption at playhead</button>
      </Section>
    </div>
  );
}

// ── Text ─────────────────────────────────────────────────────────────────────
function TextPanel() {
  const add = (presetId: string) => {
    const st = useEditor.getState();
    const p = TEXT_PRESETS.find(p => p.id === presetId)!;
    st.addItem("text", { id: newId("t"), type: "text", text: "Your text", start: st.time, duration: 3, style: { ...defaultTextStyle(), ...p.style }, transform: defaultTransform(CANVAS_W / 2, 420), animIn: { type: "pop", duration: 0.35 }, animOut: { type: "fade", duration: 0.25 } });
  };
  return (
    <div>
      <button className="st-btn primary" style={{ width: "100%", marginBottom: 12 }} onClick={() => add("classic")}>＋ Add text</button>
      <div className="st-text-presets">
        {TEXT_PRESETS.map(p => { const s = { ...defaultTextStyle(), ...p.style }; return (
          <button key={p.id} onClick={() => add(p.id)}>
            <span style={{ fontFamily: `"${s.font}"`, fontWeight: s.weight, color: s.color, WebkitTextStroke: s.strokeWidth ? `1px ${s.strokeColor}` : undefined, textTransform: s.uppercase ? "uppercase" : "none", background: s.bgColor, borderRadius: 4, padding: "2px 6px", fontStyle: s.italic ? "italic" : "normal", textShadow: s.shadow ? "0 2px 6px rgba(0,0,0,.7)" : undefined }}>{p.name}</span>
          </button>); })}
      </div>
      <div className="st-hint" style={{ marginTop: 10 }}>Drag text on the preview to place it; corners scale, ↻ rotates. Animations and keyframes are in the right panel.</div>
    </div>
  );
}

// ── Stickers ─────────────────────────────────────────────────────────────────
function StickersPanel({ refresh }: { refresh: () => Promise<void> }) {
  const assets = useEditor(s => s.assets);
  const { upload, busy } = useUpload(refresh);
  const fileRef = useRef<HTMLInputElement>(null);
  const images = Object.values(assets).filter(a => a.kind === "image" && a.status === "ready");
  const addEmoji = (e: string) => { const st = useEditor.getState(); st.addItem("overlay", { id: newId("s"), type: "sticker", emoji: e, size: 200, start: st.time, duration: 2, transform: defaultTransform(CANVAS_W / 2, 700), animIn: { type: "pop", duration: 0.3 }, animLoop: { type: "pulse", speed: 1 } }); };
  const addImage = (a: AssetView) => { const st = useEditor.getState(); st.addItem("overlay", { id: newId("s"), type: "sticker", assetId: a.id, size: 400, start: st.time, duration: 2, transform: defaultTransform(CANVAS_W / 2, 700), animIn: { type: "pop", duration: 0.3 } }); };
  return (
    <div>
      <Section title="Emoji">
        <div className="st-emoji-grid">{EMOJIS.map(e => <button key={e} onClick={() => addEmoji(e)}>{e}</button>)}</div>
      </Section>
      <Section title="Your images" right={<button className="st-link" onClick={() => fileRef.current?.click()}>Upload PNG</button>}>
        <input ref={fileRef} type="file" hidden accept="image/*" multiple onChange={async e => { for (const f of Array.from(e.target.files || [])) await upload(f); e.target.value = ""; }} />
        {busy && <div className="st-hint"><Spinner /> Uploading…</div>}
        <div className="st-img-grid">{images.map(a => <button key={a.id} onClick={() => addImage(a)} style={{ backgroundImage: `url(${a.src})` }} title={a.name} />)}</div>
        {!images.length && <div className="st-hint">Transparent PNGs work best (logos, memes, arrows).</div>}
      </Section>
    </div>
  );
}

// ── Audio ────────────────────────────────────────────────────────────────────
function AudioPanel({ refresh }: { refresh: () => Promise<void> }) {
  const assets = useEditor(s => s.assets);
  const tl = useEditor(s => s.timeline);
  const { upload, busy } = useUpload(refresh);
  const { commit } = useEditor.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const audio = Object.values(assets).filter(a => a.kind === "audio");
  const mainTrack = tl.tracks.find(t => t.kind === "video");
  const clipVol = mainTrack?.items.find(i => i.type === "video") as VideoItem | undefined;
  return (
    <div>
      <Section title="Music & SFX" right={<button className="st-link" onClick={() => fileRef.current?.click()}>Upload</button>}>
        <input ref={fileRef} type="file" hidden accept="audio/*" multiple onChange={async e => { for (const f of Array.from(e.target.files || [])) await upload(f); e.target.value = ""; }} />
        {busy && <div className="st-hint"><Spinner /> Uploading…</div>}
        {audio.map(a => (
          <div key={a.id} className={`st-media ${a.status}`}>
            <div className="st-media-thumb">🎵</div>
            <div className="st-media-info"><div className="st-media-name">{a.name}</div><div className="st-hint">{a.status === "ready" ? fmtTime(a.duration || 0) : a.status === "failed" ? <span className="st-err">{a.error}</span> : <><Spinner /> Processing…</>}</div></div>
            {a.status === "ready" && <button className="st-btn small" onClick={() => useEditor.getState().addItem("audio", { id: newId("a"), type: "audio", assetId: a.id, start: 0, duration: Math.min(a.duration || 30, Math.max(5, totalDuration(tl))), in: 0, speed: 1, volume: 0.35, fadeIn: 0.5, fadeOut: 1 })}>＋ Add</button>}
          </div>
        ))}
        {!audio.length && <div className="st-hint">Upload MP3/M4A/WAV to add background music or sound effects. Use music you have rights to — TikTok can mute videos with unlicensed audio.</div>}
      </Section>
      <Section title="Stream audio">
        <Row label="Volume"><Slider value={clipVol?.volume ?? 1} min={0} max={2} onChange={v => commit(t => { for (const tr of t.tracks) if (tr.kind === "video") for (const i of tr.items) if (i.type === "video") i.volume = v; }, { merge: true })} format={v => `${Math.round(v * 100)}%`} /></Row>
        <div className="st-btn-row">
          <button className="st-btn" onClick={() => commit(t => { for (const tr of t.tracks) if (tr.kind === "video") for (const i of tr.items) if (i.type === "video") i.muted = !i.muted; })}>{clipVol?.muted ? "Unmute stream" : "Mute stream"}</button>
          <button className="st-btn" onClick={() => commit(t => { for (const tr of t.tracks) if (tr.kind === "video") for (const i of tr.items) if (i.type === "video") { i.fadeIn = 0.3; i.fadeOut = 0.5; } })}>Fade all clips</button>
        </div>
      </Section>
    </div>
  );
}

// ── Effects ──────────────────────────────────────────────────────────────────
function EffectsPanel() {
  return (
    <div>
      <div className="st-hint" style={{ marginBottom: 10 }}>Effects are added at the playhead on their own track and apply to everything beneath them. Drag to move, pull the edges to resize.</div>
      <div className="st-grid2">
        {EFFECTS.map(e => <button key={e.id} className="st-tile" onClick={() => { const st = useEditor.getState(); st.addItem("effect", { id: newId("f"), type: "effect", effect: e.id, intensity: 1, start: st.time, duration: e.id === "flash" ? 0.4 : e.id === "punchIn" ? 1 : 2 }); }}><b>{e.name}</b><span>{e.hint}</span></button>)}
      </div>
    </div>
  );
}

// ── Filters (apply to clips) ────────────────────────────────────────────────
function FiltersPanel() {
  const tl = useEditor(s => s.timeline);
  const selectedId = useEditor(s => s.selectedId);
  const { commit } = useEditor.getState();
  const [all, setAll] = useState(true);
  const apply = (id: string) => commit(t => { for (const tr of t.tracks) for (const i of tr.items) if ((i.type === "video" || i.type === "image") && (all || i.id === selectedId)) i.filter = applyFilterPreset(id); });
  const current = tl.tracks.flatMap(t => t.items).find(i => i.id === selectedId) as VideoItem | undefined;
  return (
    <div>
      <label className="st-toggle" style={{ marginBottom: 10 }}><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /><span className="st-toggle-track"><span className="st-toggle-knob" /></span><span>Apply to all clips</span></label>
      <div className="st-grid3">
        {FILTER_PRESETS.map(p => { const f = { ...defaultFilter(), ...p.filter }; return (
          <button key={p.id} className={`st-filter ${current?.filter?.preset === p.id ? "on" : ""}`} onClick={() => apply(p.id)}>
            <div className="st-filter-swatch" style={{ filter: `brightness(${f.brightness}) contrast(${f.contrast}) saturate(${f.saturation}) hue-rotate(${f.hue}deg) sepia(${f.sepia}) grayscale(${f.grayscale})` }} />
            <span>{p.name}</span>
          </button>); })}
      </div>
      <div className="st-hint" style={{ marginTop: 10 }}>Fine-tune brightness, contrast, hue and more in the right panel with a clip selected.</div>
    </div>
  );
}

// ── Transitions ──────────────────────────────────────────────────────────────
function TransitionsPanel() {
  const tl = useEditor(s => s.timeline);
  const selectedId = useEditor(s => s.selectedId);
  const { commit } = useEditor.getState();
  const [dur, setDur] = useState(0.5);
  const [all, setAll] = useState(true);
  const pairs = tl.tracks.filter(t => t.kind === "video").flatMap(t => { const s = [...t.items].sort((a, b) => a.start - b.start); return s.slice(1).filter((c, k) => c.type === "video" && Math.abs(c.start - (s[k].start + s[k].duration)) < 0.05); });
  const apply = (type: string) => commit(t => {
    for (const tr of t.tracks) {
      if (tr.kind !== "video") continue;
      const s = [...tr.items].sort((a, b) => a.start - b.start);
      s.slice(1).forEach((c, k) => { if (c.type === "video" && Math.abs(c.start - (s[k].start + s[k].duration)) < 0.05 && (all || c.id === selectedId)) c.transition = type === "none" ? undefined : { type: type as any, duration: dur }; });
    }
  });
  return (
    <div>
      <div className="st-hint" style={{ marginBottom: 10 }}>Transitions go between clips that touch on the main track. Split a clip (S) to create a cut, then add one.</div>
      <label className="st-toggle" style={{ marginBottom: 10 }}><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /><span className="st-toggle-track"><span className="st-toggle-knob" /></span><span>Apply to all cuts ({pairs.length})</span></label>
      <Row label="Length"><Slider value={dur} min={0.1} max={2} step={0.05} onChange={setDur} format={v => `${v.toFixed(2)}s`} /></Row>
      <div className="st-grid3">{TRANSITIONS.map(t => <button key={t.id} className="st-tile" onClick={() => apply(t.id)} disabled={!pairs.length}><b>{t.name}</b></button>)}</div>
      {!pairs.length && <div className="st-empty">No cuts yet.</div>}
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────
function ExportPanel({ refresh }: { refresh: () => Promise<void> }) {
  const projectId = useEditor(s => s.projectId);
  const jobs = useEditor(s => s.jobs);
  const assets = useEditor(s => s.assets);
  const tl = useEditor(s => s.timeline);
  const title = useEditor(s => s.title);
  const campaign = useEditor(s => s.campaign);
  const tiktokConnected = useEditor(s => s.tiktokConnected);
  const setError = useEditor(s => s.setError);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const render = jobs.find(j => j.type === "render");
  const active = render && (render.status === "queued" || render.status === "running");
  const exports = Object.values(assets).filter(a => a.kind === "export" && a.status === "ready").sort((a, b) => (a.id < b.id ? 1 : -1));
  const latest = exports[0];
  const dur = totalDuration(tl);

  useEffect(() => {
    if (!active) return;
    const i = setInterval(refresh, 2000);
    return () => clearInterval(i);
  }, [active, refresh]);

  async function start() {
    setBusy(true); setSent(false);
    try { await api(`/api/projects/${projectId}/render`, { method: "POST", body: JSON.stringify({ timeline: tl }) }); await refresh(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function toTikTok() {
    setBusy(true);
    try { await api(`/api/projects/${projectId}/tiktok`, { method: "POST" }); setSent(true); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <Section title="Export">
        <div className="st-kv"><span>Output</span><b>1080 × 1920 · {tl.canvas.fps} fps · H.264</b></div>
        <div className="st-kv"><span>Length</span><b>{fmtTime(dur, true, tl.canvas.fps)}</b></div>
        <button className="st-btn primary" style={{ width: "100%", marginTop: 10 }} disabled={busy || !!active || dur < 1} onClick={start}>
          {active ? <><Spinner /> Rendering {Math.round((render!.progress || 0) * 100)}%</> : "Render video"}
        </button>
        {active && <div className="st-progress"><div style={{ width: `${Math.round((render!.progress || 0) * 100)}%` }} /></div>}
        {render?.status === "failed" && <div className="st-err" style={{ marginTop: 8 }}>{render.error}</div>}
        <div className="st-hint" style={{ marginTop: 8 }}>Rendering happens on our servers — you can keep editing or close the tab.</div>
      </Section>
      {latest && (
        <Section title="Latest export">
          <video src={latest.src || undefined} controls playsInline style={{ width: "100%", borderRadius: 10, background: "#000", aspectRatio: "9/16", maxHeight: 360 }} />
          <div className="st-btn-row" style={{ marginTop: 8 }}>
            <a className="st-btn" href={`${latest.src}&dl=1`} download={`${title || "clip"}.mp4`}>⬇ Download MP4</a>
            {tiktokConnected ? <button className="st-btn primary" onClick={toTikTok} disabled={busy || sent}>{sent ? "✓ Sent to TikTok drafts" : "Send to TikTok drafts"}</button>
              : <a className="st-btn" href="/api/auth/signin/tiktok?callbackUrl=/studio/" onClick={e => { e.preventDefault(); import("next-auth/react").then(m => m.signIn("tiktok", { callbackUrl: `/studio/${projectId}` })); }}>Connect TikTok to send drafts</a>}
          </div>
          {sent && <div className="st-hint" style={{ marginTop: 8 }}>Open the TikTok app → Inbox → finish posting from your drafts. {campaign ? ` Then submit the public link to the ${campaign.streamer} campaign from the Campaigns page.` : " To earn from it, submit the public link to a matching open campaign from the Campaigns page."}</div>}
          <div className="st-hint" style={{ marginTop: 8 }}>Not connected? Download the MP4 and post it from your phone, then submit the TikTok link on the Campaigns page.</div>
        </Section>
      )}
    </div>
  );
}

export type { Item, JobView };
