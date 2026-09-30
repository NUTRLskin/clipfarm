"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Filmstrip, Loudness, Moments, useAnalysis } from "@/components/studio/VodHighlights";
import { fmtTime } from "@/lib/editor/timeline";
import type { VodInfo } from "@/lib/twitch";
import type { Moment } from "@/lib/moments";
import "@/components/studio/studio.css";

declare global { interface Window { Twitch?: any } }

/** Streamer: one broadcast — player, full filmstrip, Top moments, and who's clipping it. */
export default function VodDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vod, setVod] = useState<VodInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cur, setCur] = useState(0);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [clippers, setClippers] = useState<any[] | null>(null);
  const analysis = useAnalysis(vod?.id ?? null);
  const playerRef = useRef<any>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/twitch/vods?id=${id}`).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setVod(j.vods[0]); }).catch(e => setError(e.message));
    fetch("/api/creator/clippers").then(r => r.json()).then(j => setClippers(j.clippers || [])).catch(() => setClippers([]));
  }, [id]);

  useEffect(() => {
    if (!vod || !hostRef.current) return;
    let dead = false; const host = hostRef.current; host.innerHTML = "";
    const boot = () => {
      if (dead || !window.Twitch?.Player) return;
      try {
        const p = new window.Twitch.Player(host, { video: vod.id, width: "100%", height: "100%", parent: [location.hostname], autoplay: false });
        playerRef.current = p;
        const tick = setInterval(() => { if (dead) return clearInterval(tick); try { setCur(p.getCurrentTime() || 0); } catch { /* */ } }, 250);
      } catch { /* embed unavailable (needs https) */ }
    };
    if (window.Twitch?.Player) boot(); else { const s = document.createElement("script"); s.src = "https://embed.twitch.tv/embed/v1.js"; s.onload = boot; document.head.appendChild(s); }
    return () => { dead = true; };
  }, [vod]);

  const seek = (t: number) => { try { playerRef.current?.seek(Math.max(0, t)); } catch { /* */ } setCur(t); };
  const use = (m: Moment) => { setMoment(m); seek(m.start); };

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <button className="st-link" onClick={() => router.push("/vods")}>← My VODs</button>
        {error && <div className="st-err" style={{ marginTop: 8 }}>{error}</div>}
        {vod && <>
          <div style={{ fontSize: 18, fontWeight: 700, margin: "6px 0 2px" }}>{vod.title}</div>
          <div className="st-hint">{fmtTime(vod.duration)} · {new Date(vod.createdAt).toLocaleString()} · <a className="st-link" href={vod.url} target="_blank" rel="noreferrer">twitch.tv ↗</a></div>
          <div className="st-player" ref={hostRef} style={{ marginTop: 10 }} />
          <Filmstrip analysis={analysis} duration={vod.duration} cur={cur} onSeek={seek} />
          <div className="st-scrub">
            <Loudness analysis={analysis} />
            <input type="range" min={0} max={vod.duration} step={1} value={cur} onChange={e => seek(Number(e.target.value))} />
            <div className="st-scrub-marks">
              {analysis?.moments.map(m => <button key={m.id} className={`moment ${moment?.id === m.id ? "on" : ""}`} title={m.reasons[0]?.label} style={{ left: `${(m.peak / vod.duration) * 100}%`, opacity: 0.45 + 0.55 * m.score }} onClick={() => use(m)} />)}
              {moment && <span className="range" style={{ left: `${(moment.start / vod.duration) * 100}%`, width: `${((moment.end - moment.start) / vod.duration) * 100}%` }} />}
            </div>
          </div>
          <div className="st-hint" style={{ marginTop: 4 }}>{fmtTime(cur)}{moment ? ` · viewing moment ${fmtTime(moment.start)}–${fmtTime(moment.end)}` : ""}</div>
          <Moments analysis={analysis} duration={vod.duration} active={moment} onUse={use} />
          <div className="st-hint" style={{ marginTop: 4 }}>These are the same moments clippers see when they open this VOD in Studio.</div>

          <div style={{ fontSize: 14, fontWeight: 600, margin: "22px 0 8px" }}>Clippers working on your channel</div>
          {clippers && clippers.length === 0 && <div className="st-empty">Nobody has pulled from your VODs yet.</div>}
          <div className="st-vod-list">
            {clippers?.slice(0, 8).map(c => (
              <div key={c.id} className="st-vod" style={{ cursor: "default" }}>
                <div style={{ flex: 1, minWidth: 0 }}><div className="st-vod-title">{c.name}</div><div className="st-hint">{c.projects} project{c.projects === 1 ? "" : "s"} · {c.imports} import{c.imports === 1 ? "" : "s"} · {c.exports} export{c.exports === 1 ? "" : "s"}{c.submitted ? ` · ${c.submitted} submitted` : ""}</div></div>
                <button className="st-btn small" onClick={() => router.push(`/clippers`)}>Details</button>
              </div>
            ))}
          </div>
        </>}
      </div>
    </AppShell>
  );
}
