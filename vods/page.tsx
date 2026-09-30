"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { fmtTime } from "@/lib/editor/timeline";
import type { VodInfo } from "@/lib/twitch";
import "@/components/studio/studio.css";

/** Streamer: my past broadcasts, with how much clipping each one is getting. */
export default function MyVods() {
  const router = useRouter();
  const [vods, setVods] = useState<VodInfo[] | null>(null);
  const [heat, setHeat] = useState<Record<string, { imports: number; clippers: number }>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/creator/vods").then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setVods(j.vods); }).catch(e => setError(e.message));
    fetch("/api/creator/clippers").then(r => r.json()).then(j => { const h: any = {}; for (const v of j.vods || []) h[v.vodId] = v; setHeat(h); }).catch(() => {});
  }, []);
  return (
    <AppShell>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>My VODs</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2, marginBottom: 16 }}>Your kept broadcasts on Twitch. Open one to see the moments clippers are being pointed at, and who&apos;s clipping it.</div>
        {error && <div className="st-err">{error}{/Twitch/.test(error) && <div className="st-hint">Streamer tools need a Twitch login. Sign out and sign back in with Twitch.</div>}</div>}
        {!vods && !error && <div className="st-hint">Loading…</div>}
        {vods?.length === 0 && <div className="st-empty">No past broadcasts found. Turn on “Store past broadcasts” in Twitch → Settings → Stream, and your next stream will show up here.</div>}
        <div className="st-vod-list">
          {vods?.map(v => {
            const h = heat[v.id];
            return (
              <button key={v.id} className="st-vod" onClick={() => router.push(`/vods/${v.id}`)}>
                <div className="st-vod-thumb" style={v.thumbnail ? { backgroundImage: `url(${v.thumbnail})` } : {}} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="st-vod-title">{v.title}</div>
                  <div className="st-hint">{fmtTime(v.duration)} · {new Date(v.createdAt).toLocaleDateString()}{v.viewCount ? ` · ${v.viewCount.toLocaleString()} views` : ""}</div>
                </div>
                <div className="st-hint" style={{ textAlign: "right", flexShrink: 0 }}>
                  {h ? <><b style={{ color: "var(--purple-text)" }}>{h.imports}</b> import{h.imports === 1 ? "" : "s"}<br />{h.clippers} clipper{h.clippers === 1 ? "" : "s"}</> : <span style={{ opacity: .6 }}>not clipped yet</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
