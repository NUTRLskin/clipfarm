"use client";
/**
 * Pick a VOD, scrub it in the official Twitch player, mark in/out, import just that range.
 */
import { useEffect, useRef, useState } from "react";
import { fmtTime } from "@/lib/editor/timeline";
import type { VodInfo } from "@/lib/twitch";
import type { Moment } from "@/lib/moments";
import { Spinner } from "./controls";
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

  useEffect(() => {
    const q = initialVodId ? `id=${encodeURIComponent(initialVodId)}` : `login=${encodeURIComponent(login)}`;
    fetch(`/api/twitch/vods?${q}`).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setVods(j.vods); if (initialVodId && j.vods[0]) setVod(j.vods[0]); })
      .catch(e => setError(e.message));
  }, [login, initialVodId]);

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
          <div><b>{streamer}&apos;s VODs</b><div className="st-hint">Scrub to the moment, mark in and out, and we&apos;ll pull just that range at full quality.</div></div>
          <button className="st-icon" onClick={onClose}>✕</button>
        </div>
        {!vod ? (
          <div className="st-vod-list">
            {error && <div className="st-err">{error}</div>}
            {!vods && !error && <div className="st-hint"><Spinner /> Loading VODs…</div>}
            {vods?.length === 0 && <div className="st-empty">No past broadcasts found. The streamer may have VOD saving turned off, or their VODs have expired (Twitch keeps them 7–60 days).</div>}
            {vods?.map(v => (
              <button key={v.id} className="st-vod" onClick={() => setVod(v)}>
                <div className="st-vod-thumb" style={v.thumbnail ? { backgroundImage: `url(${v.thumbnail})` } : {}} />
                <div><div className="st-vod-title">{v.title}</div><div className="st-hint">{fmtTime(v.duration)} · {new Date(v.createdAt).toLocaleDateString()}{v.viewCount ? ` · ${v.viewCount.toLocaleString()} views` : ""}</div></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="st-vod-editor">
            <button className="st-link" onClick={() => { setVod(null); if (initialVodId) fetch(`/api/twitch/vods?login=${encodeURIComponent(login)}`).then(r => r.json()).then(j => j.vods && setVods(j.vods)).catch(() => {}); }}>← All VODs</button>
            <div className="st-vod-title" style={{ margin: "6px 0" }}>{vod.title}</div>
            <div className="st-player" ref={hostRef} />
            {playerOk === false && (
              <div className="st-hint" style={{ marginTop: 6 }}>Player couldn&apos;t load here (Twitch embeds need an HTTPS site). You can still type times below, or open the VOD on Twitch:{" "}
                <a href={`${vod.url}?t=${Math.floor(cur)}s`} target="_blank" rel="noreferrer" className="st-link">twitch.tv ↗</a></div>
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
            <div className="st-scrub-row">
              <div className="st-btn-row">
                {[-600, -60, -10, 10, 60, 600].map(d => <button key={d} className="st-btn small" onClick={() => seek(cur + d)}>{d > 0 ? "+" : "−"}{Math.abs(d) >= 60 ? `${Math.abs(d) / 60}m` : `${Math.abs(d)}s`}</button>)}
              </div>
              <TimeInput value={cur} max={vod.duration} onChange={seek} />
            </div>
            <div className="st-inout">
              <div className={inT != null ? "set" : ""}>
                <button className="st-btn" onClick={() => { setIn(Math.floor(cur)); if (outT != null && outT <= cur) setOut(null); }}>[ Mark in</button>
                <span>{inT != null ? fmtTime(inT) : "—"}</span>
              </div>
              <div className={outT != null ? "set" : ""}>
                <button className="st-btn" onClick={() => setOut(Math.ceil(cur))} disabled={inT == null || cur <= inT}>Mark out ]</button>
                <span>{outT != null ? fmtTime(outT) : "—"}</span>
              </div>
              <div className="st-hint">{len > 0 ? `${fmtTime(len)} selected` : "Mark a start and end point"}{len > MAX_MIN * 60 && <span className="st-err"> · max {MAX_MIN} min per import</span>}</div>
            </div>
            <div className="st-btn-row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button className="st-btn" onClick={onClose}>Cancel</button>
              <button className="st-btn primary" disabled={!valid || busy} onClick={go}>{busy ? <><Spinner /> Importing…</> : `Import ${len > 0 ? fmtTime(len) : "range"}`}</button>
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
