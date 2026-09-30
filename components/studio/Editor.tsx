"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEditor } from "@/lib/editor/store";
import { totalDuration } from "@/lib/editor/timeline";
import Preview, { usePreviewEngine } from "./Preview";
import Timeline from "./Timeline";
import Inspector from "./Inspector";
import { PANELS, PanelBody } from "./Panels";
import { Spinner } from "./controls";
import "./studio.css";

export default function Editor({ projectId }: { projectId: string }) {
  const { data: session } = useSession();
  const engine = usePreviewEngine();
  const loaded = useEditor(s => s.projectId === projectId && !!s.timeline);
  const panel = useEditor(s => s.panel);
  const title = useEditor(s => s.title);
  const dirty = useEditor(s => s.dirty);
  const saving = useEditor(s => s.saving);
  const error = useEditor(s => s.error);
  const jobs = useEditor(s => s.jobs);
  const assets = useEditor(s => s.assets);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [inspOpen, setInspOpen] = useState(true);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}`);
    if (!r.ok) return;
    const j = await r.json();
    useEditor.getState().setAssets(j.assets, j.jobs);
  }, [projectId]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`).then(async r => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't open project");
      useEditor.getState().load(j);
    }).catch(e => setLoadErr(e.message));
    return () => engine.destroy();
  }, [projectId, engine]);

  useEffect(() => { useEditor.setState({ tiktokConnected: !!(session?.user as any)?.tiktokConnected }); }, [session]);

  // Poll while media is processing.
  const pending = Object.values(assets).some(a => a.status === "pending" || a.status === "processing") || jobs.some(j => j.status === "queued" || j.status === "running");
  useEffect(() => {
    if (!pending) return;
    const i = setInterval(refresh, 2000);
    return () => clearInterval(i);
  }, [pending, refresh]);

  // Autosave (debounced) + save on unload.
  const saveTimer = useRef<any>(null);
  const save = useCallback(async () => {
    const st = useEditor.getState();
    if (!st.dirty || !st.timeline) return;
    useEditor.setState({ saving: true });
    try {
      const r = await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timeline: st.timeline, title: st.title }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Save failed");
      st.markSaved();
    } catch (e: any) { useEditor.setState({ saving: false, error: `Autosave failed: ${e.message}` }); }
  }, [projectId]);
  useEffect(() => {
    if (!dirty) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 1200);
    return () => clearTimeout(saveTimer.current);
  }, [dirty, save]);
  useEffect(() => {
    const onHide = () => { const st = useEditor.getState(); if (st.dirty) navigator.sendBeacon?.(`/api/projects/${projectId}`, new Blob([JSON.stringify({ timeline: st.timeline, title: st.title })], { type: "application/json" })); };
    // sendBeacon can't PATCH; fall back to a keepalive fetch.
    const onUnload = () => { const st = useEditor.getState(); if (st.dirty) fetch(`/api/projects/${projectId}`, { method: "PATCH", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timeline: st.timeline, title: st.title }) }).catch(() => {}); };
    void onHide;
    window.addEventListener("pagehide", onUnload);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") onUnload(); });
    return () => window.removeEventListener("pagehide", onUnload);
  }, [projectId]);

  // Drag media from the panel onto the timeline area.
  function onDrop(e: React.DragEvent) {
    const id = e.dataTransfer.getData("asset");
    const a = id && assets[id];
    if (!a || a.status !== "ready") return;
    e.preventDefault();
    if (a.kind === "vod" || a.kind === "video") import("./Panels").then(m => m.addVideoToTimeline(a));
  }

  if (loadErr) return <div className="st-center"><div className="st-err">{loadErr}</div><Link href="/studio" className="st-link">← Back to Studio</Link></div>;
  if (!loaded) return <div className="st-center"><Spinner size={22} /></div>;

  return (
    <div className="st-root">
      <header className="st-top">
        <Link href="/studio" className="st-back" title="Back to projects">‹</Link>
        <input className="st-title" value={title} onChange={e => useEditor.getState().setTitle(e.target.value)} placeholder="Untitled clip" />
        <span className="st-save">{saving ? <><Spinner /> Saving</> : dirty ? "Unsaved changes" : "Saved"}</span>
        <span style={{ flex: 1 }} />
        <button className={`st-btn ${inspOpen ? "on" : ""} st-insp-toggle`} onClick={() => setInspOpen(o => !o)}>Properties</button>
        <button className="st-btn primary" onClick={() => useEditor.getState().setPanel("export")} disabled={totalDuration(useEditor.getState().timeline) < 1}>Export</button>
      </header>
      {error && <div className="st-toast" onClick={() => useEditor.getState().setError(null)}>{error} <span>✕</span></div>}
      <div className="st-main">
        <nav className="st-tabs">
          {PANELS.map(p => <button key={p.id} className={panel === p.id ? "on" : ""} onClick={() => useEditor.getState().setPanel(p.id)}><span className="st-tab-icon">{p.icon}</span><span>{p.name}</span></button>)}
        </nav>
        <aside className="st-panel"><PanelBody panel={panel} refresh={refresh} /></aside>
        <section className="st-stage" onDragOver={e => e.preventDefault()} onDrop={onDrop}><Preview engine={engine} /></section>
        {inspOpen && <aside className="st-right"><Inspector /></aside>}
      </div>
      <Timeline />
    </div>
  );
}
