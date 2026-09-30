"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import VodPicker from "@/components/studio/VodPicker";
import { Spinner } from "@/components/studio/controls";
import { Btn, Avatar } from "@/components/ui";
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

  useEffect(() => {
    fetch("/api/projects").then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setProjects(j); }).catch(e => setError(e.message));
    fetch("/api/campaigns").then(r => r.json()).then(setCampaigns);
  }, []);

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
      <div className="st-home">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Studio</div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>Pull moments from any streamer&apos;s VODs, edit for TikTok, export.</div>
          </div>
          <Btn primary onClick={() => setPick(true)}>＋ New clip</Btn>
        </div>
        {error && <div className="st-err" style={{ marginTop: 12 }}>{error}{error.includes("DATABASE_URL") && <div className="st-hint">Add a Postgres database in Railway and set DATABASE_URL — see .env.example.</div>}</div>}
        <div className="st-projects">
          {projects?.map(p => (
            <button key={p.id} className="st-project" onClick={() => router.push(`/studio/${p.id}`)}>
              <b>{p.title}</b>
              <span className="st-hint">{p.streamer || "No footage yet"} · {new Date(p.updatedAt).toLocaleDateString()}</span>
              {p.campaign && <span className="st-hint" style={{ color: "var(--purple-text, var(--text2))" }}>Campaign: {p.campaign}</span>}
              {p.exportAssetId && <span className="st-hint" style={{ color: "var(--green-text)" }}>✓ Exported</span>}
            </button>
          ))}
          {projects && projects.length === 0 && <div className="st-empty" style={{ gridColumn: "1/-1" }}>No projects yet. Search a streamer or pick an open campaign to start a clip.</div>}
        </div>
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
    <div className="st-modal-bg" onClick={onClose}>
      <div className="st-modal" onClick={e => e.stopPropagation()}>
        <div className="st-modal-head"><b>New clip</b><button className="st-icon" onClick={onClose}>✕</button></div>

        <div className="st-hint" style={{ marginBottom: 6 }}>Search any Twitch streamer, or paste a twitch.tv/videos link</div>
        <input className="st-timein" style={{ width: "100%", textAlign: "left", fontFamily: "inherit" }} autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="e.g. kaicenat, or https://www.twitch.tv/videos/123456789"
          onKeyDown={e => { if (e.key === "Enter") { if (pasted) onPick({ kind: "vod", vodId: pasted.id }); else if (results?.[0]) onPick({ kind: "channel", channel: results[0] }); } }} />
        {pasted && <button className="st-vod" style={{ marginTop: 8 }} onClick={() => onPick({ kind: "vod", vodId: pasted.id })}>
          <div className="st-vod-thumb" /><div><div className="st-vod-title">Open VOD {pasted.id}</div><div className="st-hint">Scrub and pick a range from this broadcast</div></div>
        </button>}
        {!pasted && (searching || results || err) && (
          <div className="st-vod-list" style={{ marginTop: 8, maxHeight: 260 }}>
            {err && <div className="st-err">{err}</div>}
            {searching && !results && <div className="st-hint"><Spinner /> Searching Twitch…</div>}
            {results?.length === 0 && !searching && <div className="st-empty">No channels match &quot;{q}&quot;</div>}
            {results?.map(c => (
              <button key={c.id} className="st-vod" onClick={() => onPick({ kind: "channel", channel: c })}>
                {c.avatar ? <img src={c.avatar} alt="" width={36} height={36} style={{ borderRadius: "50%", flexShrink: 0 }} /> : <Avatar initials={c.display.slice(0, 2).toUpperCase()} size={36} />}
                <div><div className="st-vod-title">{c.display}{c.live && <span className="st-hint" style={{ color: "var(--red-text, #ff2d55)", marginLeft: 6 }}>● LIVE</span>}</div>
                  <div className="st-hint">twitch.tv/{c.login}{c.game ? ` · ${c.game}` : ""}</div></div>
              </button>
            ))}
          </div>
        )}

        {open.length > 0 && <>
          <div className="st-hint" style={{ margin: "16px 0 6px" }}>Or clip for an open campaign (required to earn payouts)</div>
          <div className="st-campaign-pick">
            {open.map(c => (
              <button key={c.id} className="st-vod" onClick={() => onPick({ kind: "campaign", campaign: c })}>
                <Avatar initials={c.initials} size={36} />
                <div><div className="st-vod-title">{c.streamer}</div><div className="st-hint">twitch.tv/{c.twitchUser} · ${c.budget} budget</div></div>
              </button>
            ))}
          </div>
        </>}
        <div className="st-hint" style={{ marginTop: 12 }}>Or <button className="st-link" onClick={onEmpty}>start empty</button> and upload your own footage.</div>
      </div>
    </div>
  );
}
