"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import VodPicker from "@/components/studio/VodPicker";
import { Btn, Avatar } from "@/components/ui";
import type { Campaign } from "@/lib/mockData";
import "@/components/studio/studio.css";

type Row = { id: string; title: string; campaignId: string; streamer: string; updatedAt: string; exportAssetId: string | null };

export default function StudioHome() {
  const router = useRouter();
  const [projects, setProjects] = useState<Row[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pick, setPick] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects").then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setProjects(j); }).catch(e => setError(e.message));
    fetch("/api/campaigns").then(r => r.json()).then(setCampaigns);
  }, []);

  async function create(vod?: { vodId: string; start: number; end: number }) {
    if (!campaign) return;
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id, vod }) });
    const j = await r.json();
    if (!r.ok) { setError(j.error); return; }
    router.push(`/studio/${j.id}`);
  }

  return (
    <AppShell>
      <div className="st-home">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Studio</div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>Pull moments from a streamer&apos;s VOD, edit for TikTok, export.</div>
          </div>
          <Btn primary onClick={() => setPick(true)}>＋ New clip</Btn>
        </div>
        {error && <div className="st-err" style={{ marginTop: 12 }}>{error}{error.includes("DATABASE_URL") && <div className="st-hint">Add a Postgres database in Railway and set DATABASE_URL — see .env.example.</div>}</div>}
        <div className="st-projects">
          {projects?.map(p => (
            <button key={p.id} className="st-project" onClick={() => router.push(`/studio/${p.id}`)}>
              <b>{p.title}</b>
              <span className="st-hint">{p.streamer} · {new Date(p.updatedAt).toLocaleDateString()}</span>
              {p.exportAssetId && <span className="st-hint" style={{ color: "var(--green-text)" }}>✓ Exported</span>}
            </button>
          ))}
          {projects && projects.length === 0 && <div className="st-empty" style={{ gridColumn: "1/-1" }}>No projects yet. Start a new clip from an open campaign.</div>}
        </div>
      </div>
      {pick && !campaign && (
        <div className="st-modal-bg" onClick={() => setPick(false)}>
          <div className="st-modal" onClick={e => e.stopPropagation()}>
            <div className="st-modal-head"><b>Which campaign is this clip for?</b><button className="st-icon" onClick={() => setPick(false)}>✕</button></div>
            <div className="st-campaign-pick">
              {campaigns.filter(c => c.status === "open").map(c => (
                <button key={c.id} className="st-vod" onClick={() => setCampaign(c)}>
                  <Avatar initials={c.initials} size={36} />
                  <div><div className="st-vod-title">{c.streamer}</div><div className="st-hint">twitch.tv/{c.twitchUser} · ${c.budget} budget</div></div>
                </button>
              ))}
              {!campaigns.some(c => c.status === "open") && <div className="st-empty">No open campaigns right now.</div>}
            </div>
            <div className="st-hint" style={{ marginTop: 10 }}>Or <button className="st-link" onClick={() => { if (campaigns[0]) { setCampaign(campaigns.find(c => c.status === "open") || campaigns[0]); } }}>start empty</button> and upload your own footage.</div>
          </div>
        </div>
      )}
      {pick && campaign && (
        <VodPicker campaignId={campaign.id} streamer={campaign.streamer} onClose={() => { setPick(false); setCampaign(null); }} onImport={v => create(v)} />
      )}
    </AppShell>
  );
}
