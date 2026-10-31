"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, MessageSquare } from "lucide-react";
import AppShell from "@/components/AppShell";
import { MetricCard, Avatar, PageHeader, EmptyState, Skeleton, fmtViews, fmtMoney } from "@/components/ui";
import { Page, ErrorState, ListSkeleton, LinkBtn, ic } from "@/components/PageKit";
import "@/components/studio/studio.css";

type Clipper = { id: string; name: string; projects: number; imports: number; exports: number; submitted: number; views: number; earned: number; lastActive: string; latest: { id: string; title: string; updatedAt: string; exported: boolean }[] };

const ago = (d: string) => { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`; if (s < 86400) return `${Math.round(s / 3600)}h ago`; return `${Math.round(s / 86400)}d ago`; };

/** Streamer: everyone clipping my channel, and how far they've gotten. */
export default function Clippers() {
  const router = useRouter();
  const [data, setData] = useState<{ clippers: Clipper[]; totals: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  function load() { setError(null); setData(null); fetch("/api/creator/clippers").then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); }).catch(e => setError(e.message)); }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function message(c: Clipper) {
    // Streamers reply inside existing threads; opening one from this side lands in the inbox filtered to that clipper.
    router.push(`/inbox?with=${encodeURIComponent(c.id)}`);
  }

  return (
    <AppShell>
      <Page>
        <PageHeader title="Clippers" sub="Everyone who has pulled footage from your Twitch into the Farm." />
        {error && <ErrorState title="Couldn't load clippers" message={error} onRetry={load} />}
        {!data && !error && <>
          <div className="cf-metrics four" style={{ marginBottom: 24 }}>{[0, 1, 2, 3].map(i => <div key={i} className="cf-card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}><Skeleton h={12} w="50%" /><Skeleton h={22} w="40%" /></div>)}</div>
          <ListSkeleton rows={3} height={72} />
        </>}
        {data && <>
          <div className="cf-metrics four" style={{ marginBottom: 24 }}>
            <MetricCard label="Clippers" value={String(data.totals.clippers)} sub="Have clipped you" />
            <MetricCard label="Projects" value={String(data.totals.projects)} sub="In the Farm" />
            <MetricCard label="Exports" value={String(data.totals.exports)} sub="Finished videos" />
            <MetricCard label="Submitted" value={String(data.totals.submitted)} sub={`${fmtViews(data.totals.views)} verified views`} />
          </div>
          {data.clippers.length === 0 && <EmptyState title="No clippers yet" body="Once clippers open your VODs in the Farm, they show up here." action={<LinkBtn href="/vods">See your VODs</LinkBtn>} />}
          <div className="cf-list">
            {data.clippers.map(c => (
              <div key={c.id} className="cf-card" style={{ padding: 16, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 220px", minWidth: 0 }}>
                    <Avatar initials={c.name.slice(0, 2).toUpperCase()} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div className="cf-ellipsis" style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                      <div className="cf-meta">Active {ago(c.lastActive)} · <span className="num">{c.projects}</span> project{c.projects === 1 ? "" : "s"} · <span className="num">{c.imports}</span> import{c.imports === 1 ? "" : "s"} · <span className="num">{c.exports}</span> export{c.exports === 1 ? "" : "s"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
                    <div style={{ textAlign: "right" }}>
                      <div className="num" style={{ fontSize: 15, fontWeight: 500 }}>{c.submitted ? fmtViews(c.views) : "–"}</div>
                      <div className="cf-meta">{c.submitted ? <><span className="num">{c.submitted}</span> clip{c.submitted === 1 ? "" : "s"} · <span className="num money">{fmtMoney(c.earned)}</span></> : "Nothing submitted"}</div>
                    </div>
                    <button className="cf-btn cf-btn--sm" onClick={() => message(c)}><MessageSquare {...ic} size={14} />Message</button>
                  </div>
                </div>
                {c.latest.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {c.latest.map(p => <span key={p.id} className="cf-meta" style={{ background: "var(--surface-2)", padding: "3px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5, maxWidth: "100%" }}>
                    {p.exported ? <Check {...ic} size={12} aria-label="Exported" /> : <Pencil {...ic} size={12} aria-label="In progress" />}<span className="cf-ellipsis">{p.title}</span></span>)}
                </div>}
              </div>
            ))}
          </div>
        </>}
      </Page>
    </AppShell>
  );
}
