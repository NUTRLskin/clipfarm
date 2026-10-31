"use client";
/**
 * Pick a VOD, scrub it in the official Twitch player, mark in/out, import just that range.
 */
import { useEffect, useRef, useState } from "react";
import { fmtTime } from "@/lib/editor/timeline";
import type { VodInfo } from "@/lib/twitch";
import type { Moment } from "@/lib/moments";
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import { Spinner } from "./controls";
import { Skeleton, Advanced } from "@/components/ui";
import { Filmstrip, Loudness, Moments, useAnalysis } from "./VodHighlights";

declare global { interface Window { Twitch?: any } }

const MAX_MIN = 15;

export default function VodPicker({ login, streamer, initialVodId, onClose, onImport }: {
  /** Twitch channel login whose past broadcasts to list. */
  login: string; streamer: string;
  /** Jump straight to one VOD (e.g. from a pasted twitch.tv/videos URL). */
  initialVodId?: string;
  onClose: () => void; onImport: (v: { vodId: string; start: number; end: number }) => Promise<void>;
}) {
  const [vods, setVods] = useState<VodInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vod, setVod] = useState<VodInfo | null>(null);
  const [inT, setIn] = useState<number | null>(null);
  const [outT, setOut] = useState<number | null>(null);
  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState(false);
  const [playerOk, setPlayerOk] = useState<boolean | null>(null);
  const playerRef = useRef<any>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const analysis = useAnalysis(vod?.id ?? null);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setError(null);
    const q = initialVodId ? `id=${encodeURIComponent(initialVodId)}` : `login=${encodeURIComponent(login)}`;
    fetch(`/api/twitch/vods?${q}`).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setVods(j.vods); if (initialVodId && j.vods[0]) setVod(j.vods[0]); })
      .catch(e => setError(e.message));
  }, [login, initialVodId, attempt]);

  // Twitch embed player.
  useEffect(() => {
    if (!vod || !hostRef.current) return;
    let dead = false;
    playerRef.current = null; setPlayerOk(null); setCur(0); setMoment(null); setIn(null); setOut(null);
    const host = hostRef.current; host.innerHTML = "";
    const boot = () => {
      if (dead || !window.Twitch?.Player) return;
      try {
        const p = new window.Twitch.Player(host, { video: vod.id, width: "100%", height: "100%", parent: [location.hostname], autoplay: false, muted: false });
        playerRef.current = p;
        p.addEventListener(window.Twitch.Player.READY, () => setPlayerOk(true));
        const tick = setInterval(() => { if (dead) return clearInterval(tick); try { setCur(p.getCurrentTime() || 0); } catch { /* not ready */ } }, 250);
      } catch { setPlayerOk(false); }
    };
    if (window.Twitch?.Player) boot();
    else {
      const s = document.createElement("script"); s.src = "https://embed.twitch.tv/embed/v1.js"; s.onload = boot; s.onerror = () => setPlayerOk(false);
      document.head.appendChild(s);
      const t = setTimeout(() => { if (!window.Twitch?.Player) setPlayerOk(false); }, 6000);
      return () => { dead = true; clearTimeout(t); };
    }
    return () => { dead = true; };
  }, [vod]);

  const useMoment = (m: Moment) => { setMoment(m); setIn(m.start); setOut(m.end); seek(m.start); };
  const seek = (t: number) => { const p = playerRef.current; if (!p) return setCur(t); try { p.seek(Math.max(0, t)); } catch { /* */ } setCur(t); };
  const len = inT != null && outT != null ? outT - inT : 0;
  const valid = inT != null && outT != null && outT > inT + 0.5 && len <= MAX_MIN * 60;

  async function go() {
    if (!vod || !valid) return;
    setBusy(true);
    try { await onImport({ vodId: vod.id, start: inT!, end: outT! }); }
    finally { setBusy(false); }
  }

  return (
    <div className="st-modal-bg" onClick={onClose}>
      <div className="st-modal wide" onClick={e => e.stopPropagation()}>
        <div className="st-modal-head">
          <div style={{ minWidth: 0 }}><div className="cf-h2" style={{ fontSize: 18 }}>{streamer}&apos;s VODs</div><div className="cf-sub" style={{ marginTop: 2 }}>Pick a top moment or set a start and end. We pull just that part at full quality.</div></div>
          <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: "0 8px", flexShrink: 0 }}><X size={16} strokeWidth={1.75} /></button>
        </div>
        {!vod ? (
          <div className="st-vod-list">
            {error && <div className="cf-card" role="alert" style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", borderColor: "rgba(248,113,113,.25)" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>Couldn&apos;t load VODs</div><div className="cf-sub" style={{ wordBreak: "break-word" }}>{error}</div></div>
              <button className="cf-btn cf-btn--sm" onClick={() => setAttempt(a => a + 1)}>Retry</button></div>}
            {!vods && !error && Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: 10 }}><Skeleton h={54} w={96} r={8} /><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}><Skeleton h={13} w="70%" /><Skeleton h={11} w="40%" /></div></div>
            ))}
            {vods?.length === 0 && <div className="cf-card" style={{ padding: "28px 20px", textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 600 }}>No past broadcasts</div><div className="cf-sub" style={{ marginTop: 4 }}>This streamer may have VOD saving off, or their VODs expired (Twitch keeps them 7–60 days).</div><button className="cf-btn" style={{ marginTop: 14 }} onClick={onClose}>Pick another streamer</button></div>}
            {vods?.map(v => (
              <button key={v.id} className="st-vod" onClick={() => setVod(v)}>
                <div className="st-vod-thumb" style={v.thumbnail ? { backgroundImage: `url(${v.thumbnail})` } : {}} />
                <div style={{ minWidth: 0 }}><div className="st-vod-title">{v.title}</div><div className="cf-meta"><span className="num">{fmtTime(v.duration)}</span> · {new Date(v.createdAt).toLocaleDateString()}{v.viewCount ? <> · <span className="num">{v.viewCount.toLocaleString()}</span> views</> : ""}</div></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="st-vod-editor">
            <button className="cf-link" onClick={() => { setVod(null); if (initialVodId) fetch(`/api/twitch/vods?login=${encodeURIComponent(login)}`).then(r => r.json()).then(j => j.vods && setVods(j.vods)).catch(() => {}); }}><ArrowLeft size={14} strokeWidth={1.75} />All VODs</button>
            <div className="st-vod-title" style={{ margin: "8px 0", fontSize: 15 }}>{vod.title}</div>
            <div className="st-player" ref={hostRef} />
            {playerOk === false && (
              <div className="cf-sub" style={{ marginTop: 8 }}>The player can&apos;t load here (Twitch embeds need an HTTPS site). You can still type times under Fine-tune position, or{" "}
                <a href={`${vod.url}?t=${Math.floor(cur)}s`} target="_blank" rel="noreferrer" className="cf-link">open it on Twitch<ExternalLink size={13} strokeWidth={1.75} /></a></div>
            )}
            <Filmstrip analysis={analysis} duration={vod.duration} cur={cur} onSeek={seek} />
            <div className="st-scrub">
              <Loudness analysis={analysis} />
              <input type="range" min={0} max={vod.duration} step={1} value={cur} onChange={e => seek(Number(e.target.value))} />
              <div className="st-scrub-marks">
                {analysis?.moments.map(m => (
                  <button key={m.id} className={`moment ${moment?.id === m.id ? "on" : ""}`} title={m.reasons[0]?.label} style={{ left: `${(m.peak / vod.duration) * 100}%`, opacity: 0.45 + 0.55 * m.score }} onClick={() => useMoment(m)} />
                ))}
                {inT != null && <span className="in" style={{ left: `${(inT / vod.duration) * 100}%` }} />}
                {outT != null && <span className="out" style={{ left: `${(outT / vod.duration) * 100}%` }} />}
                {inT != null && outT != null && <span className="range" style={{ left: `${(inT / vod.duration) * 100}%`, width: `${((outT - inT) / vod.duration) * 100}%` }} />}
              </div>
            </div>
            <Moments analysis={analysis} duration={vod.duration} active={moment} onUse={useMoment} />
            <div className="st-inout">
              <div className={inT != null ? "set" : ""}>
                <button className="cf-btn cf-btn--sm" onClick={() => { setIn(Math.floor(cur)); if (outT != null && outT <= cur) setOut(null); }}>Set start</button>
                <span>{inT != null ? fmtTime(inT) : "–"}</span>
              </div>
              <div className={outT != null ? "set" : ""}>
                <button className="cf-btn cf-btn--sm" onClick={() => setOut(Math.ceil(cur))} disabled={inT == null || cur <= inT}>Set end</button>
                <span>{outT != null ? fmtTime(outT) : "–"}</span>
              </div>
              <div className="cf-meta">{len > 0 ? <><span className="num">{fmtTime(len)}</span> selected</> : "Set a start and an end"}{len > MAX_MIN * 60 && <span style={{ color: "var(--danger)" }}> · {MAX_MIN} min max per import</span>}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Advanced label="Fine-tune position">
                <div className="st-scrub-row">
                  <div className="st-btn-row">
                    {[-600, -60, -10, 10, 60, 600].map(d => <button key={d} className="cf-btn cf-btn--sm num" onClick={() => seek(cur + d)}>{d > 0 ? "+" : "−"}{Math.abs(d) >= 60 ? `${Math.abs(d) / 60}m` : `${Math.abs(d)}s`}</button>)}
                  </div>
                  <TimeInput value={cur} max={vod.duration} onChange={seek} />
                </div>
              </Advanced>
            </div>
            <div className="st-btn-row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button className="cf-btn cf-btn--ghost" onClick={onClose}>Cancel</button>
              <button className="cf-btn cf-btn--primary" disabled={!valid || busy} onClick={go}>{busy ? <><Spinner /> Importing…</> : len > 0 ? <>Import <span className="num">{fmtTime(len)}</span></> : "Import range"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimeInput({ value, max, onChange }: { value: number; max: number; onChange: (t: number) => void }) {
  const [txt, setTxt] = useState("");
  const [focus, setFocus] = useState(false);
  const shown = focus ? txt : hms(value);
  return <input className="st-timein" value={shown} onFocus={() => { setTxt(hms(value)); setFocus(true); }} onBlur={() => { setFocus(false); const t = parse(txt); if (t != null) onChange(Math.min(max, t)); }}
    onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} placeholder="h:mm:ss" />;
}
const hms = (t: number) => `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const parse = (s: string) => { const p = s.trim().split(":").map(Number); if (p.some(isNaN) || !p.length) return null; return p.reduce((a, b) => a * 60 + b, 0); };
