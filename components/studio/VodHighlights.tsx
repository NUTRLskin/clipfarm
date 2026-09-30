"use client";
/** Full-VOD highlight views shared by the clipper's VodPicker and the streamer's My VODs page. */
import { useEffect, useRef, useState } from "react";
import { fmtTime } from "@/lib/editor/timeline";
import type { AnalysisView, Moment } from "@/lib/moments";
import { Spinner } from "./controls";

// ── Highlight analysis ───────────────────────────────────────────────────────
export function useAnalysis(vodId: string | null) {
  const [a, setA] = useState<AnalysisView | null>(null);
  useEffect(() => {
    setA(null);
    if (!vodId) return;
    let dead = false, timer: any;
    const tick = async () => {
      try {
        const r = await fetch(`/api/twitch/analysis?vodId=${vodId}`);
        const j = await r.json();
        if (dead) return;
        if (r.ok) { setA(j); if (j.status === "pending" || j.status === "processing") timer = setTimeout(tick, 3000); }
        else setA({ vodId, status: "failed", progress: 0, duration: null, thumbs: null, wave: null, thumbsInfo: null, signals: { clips: false, chat: false, audio: false }, moments: [], error: j.error });
      } catch { if (!dead) timer = setTimeout(tick, 5000); }
    };
    tick();
    return () => { dead = true; clearTimeout(timer); };
  }, [vodId]);
  return a;
}

/** Style for one sprite-sheet tile at VOD time t. */
export function tileStyle(a: AnalysisView | null, t: number): React.CSSProperties | undefined {
  const info = a?.thumbsInfo;
  if (!a?.thumbs || !info) return undefined;
  const k = Math.max(0, Math.min(info.count - 1, Math.floor(t / info.interval)));
  const col = k % info.cols, row = Math.floor(k / info.cols);
  return {
    backgroundImage: `url(${a.thumbs})`, backgroundSize: `${info.cols * 100}% ${info.rows * 100}%`,
    backgroundPosition: `${info.cols > 1 ? (col / (info.cols - 1)) * 100 : 0}% ${info.rows > 1 ? (row / (info.rows - 1)) * 100 : 0}%`,
  };
}

/** The whole stream as a strip of frames — click anywhere to jump there. */
export function Filmstrip({ analysis, duration, cur, onSeek }: { analysis: AnalysisView | null; duration: number; cur: number; onSeek: (t: number) => void }) {
  const N = 28;
  const ready = analysis?.status === "ready" && analysis.thumbs;
  return (
    <div className="st-film" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * duration); }}>
      {Array.from({ length: N }, (_, i) => {
        const t = ((i + 0.5) / N) * duration;
        return <div key={i} className="st-film-tile" style={ready ? tileStyle(analysis, t) : undefined} title={fmtTime(t)} />;
      })}
      <div className="st-film-cur" style={{ left: `${(cur / duration) * 100}%` }} />
      {!ready && (
        <div className="st-film-status">
          {analysis?.status === "failed" ? <span className="st-err">{analysis.error || "Analysis failed"}</span>
            : <><Spinner /> {analysis ? `Scanning stream for moments… ${Math.round((analysis.progress || 0) * 100)}%` : "Loading…"}</>}
        </div>
      )}
    </div>
  );
}

/** Loudness curve drawn behind the scrub bar. */
export function Loudness({ analysis }: { analysis: AnalysisView | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<Uint8Array | null>(null);
  useEffect(() => {
    setPeaks(null);
    if (!analysis?.wave) return;
    fetch(analysis.wave).then(r => r.json()).then(j => setPeaks(Uint8Array.from(atob(j.peaks), c => c.charCodeAt(0)))).catch(() => {});
  }, [analysis?.wave]);
  useEffect(() => {
    const c = ref.current; if (!c || !peaks) return;
    const W = c.width = c.clientWidth * 2, H = c.height = 44;
    const ctx = c.getContext("2d")!; ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(191,148,255,0.35)";
    const per = peaks.length / W;
    for (let x = 0; x < W; x++) {
      let m = 0; for (let k = Math.floor(x * per); k < Math.floor((x + 1) * per) && k < peaks.length; k++) if (peaks[k] > m) m = peaks[k];
      const h = (m / 255) * H; ctx.fillRect(x, H - h, 1, h);
    }
  }, [peaks]);
  return <canvas ref={ref} className="st-loud" />;
}

const REASON_ICON: Record<string, string> = { clips: "✂", chat: "💬", audio: "🔊" };

export function Moments({ analysis, duration, active, onUse }: { analysis: AnalysisView | null; duration: number; active: Moment | null; onUse: (m: Moment) => void }) {
  if (!analysis || analysis.status !== "ready") return null;
  const list = analysis.moments;
  return (
    <div className="st-moments">
      <div className="st-moments-head">
        <b>Top moments</b>
        <span className="st-hint">
          {list.length ? `${list.length} found from ` : "None found from "}
          {[analysis.signals.clips && "viewer clips", analysis.signals.chat && "chat", analysis.signals.audio && "audio"].filter(Boolean).join(", ") || "this VOD"}
        </span>
      </div>
      {list.length === 0 && <div className="st-hint">Nothing stood out in this stream — scrub manually or try another VOD.</div>}
      <div className="st-moments-row">
        {list.map((m, i) => (
          <button key={m.id} className={`st-moment ${active?.id === m.id ? "on" : ""}`} onClick={() => onUse(m)}>
            <div className="st-moment-thumb" style={tileStyle(analysis, Math.min(duration - 1, m.peak))}><span className="rank">#{i + 1}</span><span className="len">{fmtTime(m.end - m.start)}</span></div>
            <div className="st-moment-body">
              <div className="st-moment-title">{m.title || `${fmtTime(m.start)} – ${fmtTime(m.end)}`}</div>
              {m.title && <div className="st-hint">{fmtTime(m.start)} – {fmtTime(m.end)}</div>}
              <div className="st-moment-reasons">{m.reasons.map(r => <span key={r.type} title={r.label}>{REASON_ICON[r.type]} {r.label}</span>)}</div>
              <div className="st-moment-score"><i style={{ width: `${Math.round(m.score * 100)}%` }} /></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
