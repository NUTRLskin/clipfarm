"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import AppShell from "@/components/AppShell";
import { PageHeader, EmptyState } from "@/components/ui";
import { Page, ErrorState, ListSkeleton, LinkBtn, ic } from "@/components/PageKit";
import { fmtTime } from "@/lib/editor/timeline";
import type { VodInfo } from "@/lib/twitch";
import "@/components/studio/studio.css";

/** Streamer: my past broadcasts, with how much clipping each one is getting. */
export default function MyVods() {
  const router = useRouter();
  const [vods, setVods] = useState<VodInfo[] | null>(null);
  const [heat, setHeat] = useState<Record<string, { imports: number; clippers: number }>>({});
  const [error, setError] = useState<string | null>(null);
  function load() {
    setError(null); setVods(null);
    fetch("/api/creator/vods").then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setVods(j.vods); }).catch(e => setError(e.message));
    fetch("/api/creator/clippers").then(r => r.json()).then(j => { const h: any = {}; for (const v of j.vods || []) h[v.vodId] = v; setHeat(h); }).catch(() => {});
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AppShell>
      <Page>
        <PageHeader title="Your VODs" sub="Your saved Twitch broadcasts. Open one to see its top moments and who's clipping it." />
        {error && <ErrorState title="Couldn't load your VODs" message={error} onRetry={load}>{/Twitch/.test(error) && <div className="cf-meta" style={{ marginTop: 4 }}>Streamer tools need a Twitch login. Sign out, then sign back in with Twitch.</div>}</ErrorState>}
        {!vods && !error && <ListSkeleton rows={4} height={76} />}
        {vods?.length === 0 && <EmptyState title="No past broadcasts yet" body="Turn on “Store past broadcasts” in your Twitch stream settings. Your next stream shows up here."
          action={<LinkBtn href="https://dashboard.twitch.tv/settings/stream" external>Open Twitch settings<ExternalLink {...ic} size={14} /></LinkBtn>} />}
        {vods && vods.length > 0 && <div className="st-vod-list">
          {vods.map(v => {
            const h = heat[v.id];
            return (
              <button key={v.id} className="st-vod cf-vod-row" onClick={() => router.push(`/vods/${v.id}`)}>
                <div className="st-vod-thumb" style={v.thumbnail ? { backgroundImage: `url(${v.thumbnail})` } : {}} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="st-vod-title">{v.title}</div>
                  <div className="cf-meta"><span className="num">{fmtTime(v.duration)}</span> · {new Date(v.createdAt).toLocaleDateString()}{v.viewCount ? <> · <span className="num">{v.viewCount.toLocaleString()}</span> views</> : ""}</div>
                </div>
                <div className="cf-meta" style={{ textAlign: "right", flexShrink: 0 }}>
                  {h ? <><span className="num" style={{ color: "var(--text)", fontWeight: 500 }}>{h.imports}</span> import{h.imports === 1 ? "" : "s"}<br /><span className="num">{h.clippers}</span> clipper{h.clippers === 1 ? "" : "s"}</> : "Not clipped yet"}
                </div>
              </button>
            );
          })}
        </div>}
      </Page>
    </AppShell>
  );
}
