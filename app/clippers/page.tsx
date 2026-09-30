"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { MetricCard, Avatar, fmtViews, fmtMoney } from "@/components/ui";
import "@/components/studio/studio.css";

type Clipper = { id: string; name: string; projects: number; imports: number; exports: number; submitted: number; views: number; earned: number; lastActive: string; latest: { id: string; title: string; updatedAt: string; exported: boolean }[] };

const ago = (d: string) => { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`; if (s < 86400) return `${Math.round(s / 3600)}h ago`; return `${Math.round(s / 86400)}d ago`; };

/** Streamer: everyone clipping my channel, and how far they've gotten. */
export default function Clippers() {
  const router = useRouter();
  const [data, setData] = useState<{ clippers: Clipper[]; totals: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch("/api/creator/clippers").then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); }).catch(e => setError(e.message)); }, []);

  async function message(c: Clipper) {
    // Streamers reply inside existing threads; opening one from this side lands in the inbox filtered to that clipper.
    router.push(`/inbox?with=${encodeURIComponent(c.id)}`);
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Clippers</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2, marginBottom: 16 }}>Everyone who has pulled footage from your Twitch into ClipFarm Studio.</div>
        {error && <div className="st-err">{error}</div>}
        {data && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
            <MetricCard label="Clippers" value={String(data.totals.clippers)} sub="have clipped you" />
            <MetricCard label="Projects" value={String(data.totals.projects)} sub="in Studio" />
            <MetricCard label="Exports" value={String(data.totals.exports)} sub="finished videos" />
            <MetricCard label="Submitted" value={String(data.totals.submitted)} sub={`${fmtViews(data.totals.views)} views`} />
          </div>
          {data.clippers.length === 0 && <div className="st-empty">Nobody yet. Once clippers open your VODs in Studio they&apos;ll show up here.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.clippers.map(c => (
              <div key={c.id} style={{ background: "var(--bg1)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar initials={c.name.slice(0, 2).toUpperCase()} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                    <div className="st-hint">Active {ago(c.lastActive)} · {c.projects} project{c.projects === 1 ? "" : "s"} · {c.imports} import{c.imports === 1 ? "" : "s"} · {c.exports} export{c.exports === 1 ? "" : "s"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c.submitted ? fmtViews(c.views) : "—"}</div>
                    <div className="st-hint">{c.submitted ? `${c.submitted} clip${c.submitted === 1 ? "" : "s"} · ${fmtMoney(c.earned)}` : "nothing submitted"}</div>
                  </div>
                  <button className="st-btn small" onClick={() => message(c)}>Message</button>
                </div>
                {c.latest.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {c.latest.map(p => <span key={p.id} className="st-hint" style={{ background: "var(--bg2)", padding: "3px 8px", borderRadius: 6 }}>{p.exported ? "✓ " : "✎ "}{p.title}</span>)}
                </div>}
              </div>
            ))}
          </div>
        </>}
      </div>
    </AppShell>
  );
}
