"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Avatar, PageHeader, SectionTitle, EmptyState, Skeleton } from "@/components/ui";
import { Page, ErrorState, ListSkeleton, LinkBtn, ic } from "@/components/PageKit";
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
  const [attempt, setAttempt] = useState(0);
  const analysis = useAnalysis(vod?.id ?? null);
  const playerRef = useRef<any>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setError(null);
    fetch(`/api/twitch/vods?id=${id}`).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setVod(j.vods[0]); }).catch(e => setError(e.message));
    fetch("/api/creator/clippers").then(r => r.json()).then(j => setClippers(j.clippers || [])).catch(() => setClippers([]));
  }, [id, attempt]);

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
      <Page>
        <button className="cf-link" style={{ marginBottom: 12 }} onClick={() => router.push("/vods")}><ArrowLeft {...ic} size={14} />Your VODs</button>
        {error && <ErrorState title="Couldn't load this VOD" message={error} onRetry={() => setAttempt(a => a + 1)} />}
        {!vod && !error && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><Skeleton h={28} w="60%" /><Skeleton h={14} w="35%" /><div style={{ aspectRatio: "16/9", width: "100%", borderRadius: 12, background: "var(--surface-2)" }} /></div>}
        {vod && <>
          <PageHeader title={vod.title}
            sub={<><span className="num">{fmtTime(vod.duration)}</span> · {new Date(vod.createdAt).toLocaleString()}</>}
            action={<LinkBtn href={vod.url} external small ghost>Watch on Twitch<ExternalLink {...ic} size={14} /></LinkBtn>} />
          <div className="st-player" ref={hostRef} />
          <Filmstrip analysis={analysis} duration={vod.duration} cur={cur} onSeek={seek} />
          <div className="st-scrub">
            <Loudness analysis={analysis} />
            <input type="range" min={0} max={vod.duration} step={1} value={cur} onChange={e => seek(Number(e.target.value))} aria-label="Position in VOD" />
            <div className="st-scrub-marks">
              {analysis?.moments.map(m => <button key={m.id} className={`moment ${moment?.id === m.id ? "on" : ""}`} title={m.reasons[0]?.label} style={{ left: `${(m.peak / vod.duration) * 100}%`, opacity: 0.45 + 0.55 * m.score }} onClick={() => use(m)} />)}
              {moment && <span className="range" style={{ left: `${(moment.start / vod.duration) * 100}%`, width: `${((moment.end - moment.start) / vod.duration) * 100}%` }} />}
            </div>
          </div>
          <div className="cf-meta" style={{ marginTop: 4 }}><span className="num">{fmtTime(cur)}</span>{moment ? <> · viewing moment <span className="num">{fmtTime(moment.start)}–{fmtTime(moment.end)}</span></> : ""}</div>
          <Moments analysis={analysis} duration={vod.duration} active={moment} onUse={use} />
          <div className="cf-meta" style={{ marginTop: 4 }}>Clippers see these same moments when they open this VOD in the Farm.</div>

          <SectionTitle>Clippers working on your channel</SectionTitle>
          {!clippers && <ListSkeleton rows={2} height={56} />}
          {clippers && clippers.length === 0 && <EmptyState title="Nobody's clipping yet" body="When clippers pull from your VODs, they show up here." action={<LinkBtn href="/clippers">See all clippers</LinkBtn>} />}
          {clippers && clippers.length > 0 && <div className="cf-card cf-rows">
            {clippers.slice(0, 8).map(c => (
              <div key={c.id} className="cf-row" style={{ flexWrap: "wrap" }}>
                <Avatar initials={String(c.name).slice(0, 2).toUpperCase()} size={32} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="cf-ellipsis" style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
                  <div className="cf-meta"><span className="num">{c.projects}</span> project{c.projects === 1 ? "" : "s"} · <span className="num">{c.imports}</span> import{c.imports === 1 ? "" : "s"} · <span className="num">{c.exports}</span> export{c.exports === 1 ? "" : "s"}{c.submitted ? <> · <span className="num">{c.submitted}</span> submitted</> : ""}</div>
                </div>
                <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => router.push(`/clippers`)}>Details</button>
              </div>
            ))}
          </div>}
        </>}
      </Page>
    </AppShell>
  );
}
