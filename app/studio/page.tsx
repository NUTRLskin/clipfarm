"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors, CheckCircle2, Film, Link2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import VodPicker from "@/components/studio/VodPicker";
import { Btn, Avatar, Badge, PageHeader, EmptyState, Advanced, Skeleton } from "@/components/ui";
import { Sheet, ErrorState, ListSkeleton, ic } from "@/components/PageKit";
import type { Campaign } from "@/lib/mockData";
import type { ChannelInfo } from "@/lib/twitch";
import { parseVodInput } from "@/lib/twitchParse";
import "@/components/studio/studio.css";

type Row = { id: string; title: string; campaignId: string | null; streamer: string; campaign: string | null; twitchAvatar: string | null; updatedAt: string; exportAssetId: string | null };
/** What the clipper picked in the "New clip" modal. */
type Source = { kind: "campaign"; campaign: Campaign } | { kind: "channel"; channel: ChannelInfo } | { kind: "vod"; vodId: string };

export default function StudioHome() {
  const router = useRouter();
  const [projects, setProjects] = useState<Row[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pick, setPick] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null); setProjects(null);
    fetch("/api/projects").then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setProjects(j); }).catch(e => setError(e.message));
    fetch("/api/campaigns").then(r => r.json()).then(j => { if (Array.isArray(j)) setCampaigns(j); }).catch(() => {});
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function create(vod?: { vodId: string; start: number; end: number }) {
    const body: any = { vod };
    if (source?.kind === "campaign") body.campaignId = source.campaign.id;
    if (source?.kind === "channel") body.twitchLogin = source.channel.login;
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setError(j.error); throw new Error(j.error); }
    router.push(`/studio/${j.id}`);
  }
  const close = () => { setPick(false); setSource(null); };

  // Which channel/streamer the VodPicker should list.
  const pickerLogin = source?.kind === "campaign" ? source.campaign.twitchUser : source?.kind === "channel" ? source.channel.login : "";
  const pickerName = source?.kind === "campaign" ? source.campaign.streamer : source?.kind === "channel" ? source.channel.display : "Twitch";

  return (
    <AppShell>
      <div className="st-home cf-rise">
        <PageHeader title="Farm" sub="Pick a streamer's VOD, let the Farm find the best moments, and cut clips for TikTok."
          action={<Btn primary onClick={() => setPick(true)}><Scissors {...ic} />Farm a VOD</Btn>} />
        {error && <div style={{ marginBottom: 16 }}><ErrorState title="Something went wrong" message={error} onRetry={load}>{error.includes("DATABASE_URL") && <div className="cf-meta" style={{ marginTop: 4 }}>Add a Postgres database in Railway and set DATABASE_URL. See .env.example.</div>}</ErrorState></div>}
        {!projects && !error && <ListSkeleton rows={6} height={96} card />}
        {projects && projects.length === 0 && <EmptyState title="No projects yet" body="Search a streamer or pick an open contract, and your first project starts here." action={<Btn onClick={() => setPick(true)}><Scissors {...ic} />Farm a VOD</Btn>} />}
        {projects && projects.length > 0 && <div className="st-projects">
          {projects.map(p => (
            <button key={p.id} className="st-project" onClick={() => router.push(`/studio/${p.id}`)}>
              <b>{p.title}</b>
              <span className="cf-meta">{p.streamer || "No footage yet"} · {new Date(p.updatedAt).toLocaleDateString()}</span>
              {(p.campaign || p.exportAssetId) && <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {p.campaign && <Badge type="purple">Contract: {p.campaign}</Badge>}
                {p.exportAssetId && <Badge><CheckCircle2 {...ic} size={12} />Exported</Badge>}
              </span>}
            </button>
          ))}
        </div>}
      </div>
      {pick && !source && <NewClipModal campaigns={campaigns} onClose={close} onPick={setSource} onEmpty={() => create()} />}
      {pick && source && (
        <VodPicker
          login={pickerLogin} streamer={pickerName}
          initialVodId={source.kind === "vod" ? source.vodId : undefined}
          onClose={close} onImport={v => create(v)}
        />
      )}
    </AppShell>
  );
}

function NewClipModal({ campaigns, onClose, onPick, onEmpty }: { campaigns: Campaign[]; onClose: () => void; onPick: (s: Source) => void; onEmpty: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ChannelInfo[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pasted = parseVodInput(q);

  useEffect(() => {
    setErr(null);
    if (pasted || q.trim().length < 2) { setResults(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/twitch/search?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal })
        .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setResults(j.channels); })
        .catch(e => { if (e.name !== "AbortError") setErr(e.message); })
        .finally(() => setSearching(false));
    }, 300);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = campaigns.filter(c => c.status === "open");
  return (
    <Sheet title="Farm a VOD" sub="Search a Twitch streamer, or paste a twitch.tv/videos link." onClose={onClose}>
      <input autoFocus value={q} onChange={e => setQ(e.target.value)} aria-label="Streamer or VOD link"
        placeholder="e.g. kaicenat, or twitch.tv/videos/123456789"
        onKeyDown={e => { if (e.key === "Enter") { if (pasted) onPick({ kind: "vod", vodId: pasted.id }); else if (results?.[0]) onPick({ kind: "channel", channel: results[0] }); } }} />
      {pasted && <button className="st-vod" style={{ marginTop: 8 }} onClick={() => onPick({ kind: "vod", vodId: pasted.id })}>
        <div className="cf-thumb-icon" style={{ width: 36, height: 36, borderRadius: "50%" }}><Link2 {...ic} /></div>
        <div style={{ minWidth: 0 }}><div className="st-vod-title">Open VOD <span className="num">{pasted.id}</span></div><div className="cf-meta">Scrub it and pick the part you want</div></div>
      </button>}
      {!pasted && (searching || results || err) && (
        <div className="st-vod-list" style={{ marginTop: 8, maxHeight: 260, overflowY: "auto" }}>
          {err && <ErrorState title="Search didn't work" message={err} />}
          {searching && !results && Array.from({ length: 3 }, (_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10 }}><Skeleton h={36} w={36} r={18} /><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><Skeleton h={12} w="45%" /><Skeleton h={10} w="30%" /></div></div>
          ))}
          {results?.length === 0 && !searching && <div className="cf-sub" style={{ padding: 12, textAlign: "center" }}>No streamers match &quot;{q}&quot;. Check the spelling.</div>}
          {results?.map(c => (
            <button key={c.id} className="st-vod" onClick={() => onPick({ kind: "channel", channel: c })}>
              <Avatar initials={c.display.slice(0, 2).toUpperCase()} size={36} src={c.avatar} />
              <div style={{ minWidth: 0, flex: 1 }}><div className="st-vod-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>{c.display}{c.live && <Badge type="red">Live</Badge>}</div>
                <div className="cf-meta cf-ellipsis">twitch.tv/{c.login}{c.game ? ` · ${c.game}` : ""}</div></div>
            </button>
          ))}
        </div>
      )}

      {open.length > 0 && <>
        <div className="cf-label" style={{ margin: "20px 0 8px" }}>Or clip for an open contract (you only get paid on contract clips)</div>
        <div className="st-campaign-pick">
          {open.map(c => (
            <button key={c.id} className="st-vod" onClick={() => onPick({ kind: "campaign", campaign: c })}>
              <Avatar initials={c.initials} size={36} />
              <div style={{ minWidth: 0 }}><div className="st-vod-title">{c.streamer}</div><div className="cf-meta cf-ellipsis">twitch.tv/{c.twitchUser} · <span className="num">${c.budget}</span> budget</div></div>
            </button>
          ))}
        </div>
      </>}
      <div style={{ marginTop: 16 }}>
        <Advanced label="More options">
          <button className="cf-btn cf-btn--sm" onClick={onEmpty}><Film {...ic} size={14} />Start empty and upload your own footage</button>
        </Advanced>
      </div>
    </Sheet>
  );
}
