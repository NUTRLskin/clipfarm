"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Btn } from "@/components/ui";
import type { Campaign } from "@/lib/mockData";

export default function SubmitClipModal({ campaign, tiktokConnected, tiktokRequired, onClose, onSubmitted }:{
  campaign: Campaign; tiktokConnected: boolean; tiktokRequired: boolean; onClose: () => void; onSubmitted: () => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    const res = await fetch("/api/clips", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id, url, title }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(json.error || "Something went wrong"); return; }
    onSubmitted();
  }

  const needsConnect = tiktokRequired && !tiktokConnected;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "var(--bg1)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: "env(safe-area-inset-bottom)" }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Submit a clip</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>{campaign.streamer} campaign</div>
        {needsConnect ? (
          <>
            <div style={{ fontSize: 13, color: "var(--text1)", marginBottom: 14, lineHeight: 1.5 }}>Connect your TikTok so we can verify the clip is yours and track its views automatically.</div>
            <Btn primary full onClick={() => signIn("tiktok", { callbackUrl: "/campaigns" })}>Connect TikTok</Btn>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "var(--text1)", marginBottom: 5 }}>TikTok video link</div>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@you/video/…" style={{ width: "100%", marginBottom: 12 }} />
            <div style={{ fontSize: 11, color: "var(--text1)", marginBottom: 5 }}>Title (optional{tiktokConnected ? " — we'll use your TikTok caption" : ""})</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What happens in the clip" style={{ width: "100%", marginBottom: 14 }} />
            {error && <div style={{ fontSize: 13, color: "var(--red-text)", marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
              <Btn primary onClick={submit} disabled={busy || !url} style={{ flex: 1 }}>{busy ? "Verifying…" : "Submit"}</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
