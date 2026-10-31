"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { AlertCircle } from "lucide-react";
import { Btn } from "@/components/ui";
import { Sheet, ic } from "@/components/PageKit";
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
    if (!res.ok) { setError(json.error || "Something went wrong. Try again."); return; }
    onSubmitted();
  }

  const needsConnect = tiktokRequired && !tiktokConnected;
  return (
    <Sheet title="Submit a clip" sub={`For ${campaign.streamer}'s contract`} onClose={onClose}>
      {needsConnect ? (
        <>
          <p className="cf-sub" style={{ marginBottom: 16, lineHeight: 1.5 }}>Connect your TikTok first. We use it to check the clip is yours and to count its views.</p>
          <Btn primary full onClick={async () => { await fetch("/api/account/link", { method: "POST" }); signIn("tiktok", { callbackUrl: "/campaigns" }); }}>Connect TikTok</Btn>
        </>
      ) : (
        <>
          <label className="cf-field">
            <span className="cf-label">TikTok video link</span>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@you/video/…" inputMode="url" />
          </label>
          <label className="cf-field">
            <span className="cf-label">Title (optional{tiktokConnected ? ". We'll use your TikTok caption if you leave it blank" : ""})</span>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What happens in the clip" />
          </label>
          {error && <div role="alert" style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--danger)", marginBottom: 14 }}><AlertCircle {...ic} style={{ flexShrink: 0, marginTop: 2 }} />{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn ghost onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
            <Btn primary onClick={submit} disabled={busy || !url} style={{ flex: 1 }}>{busy ? "Checking…" : "Submit clip"}</Btn>
          </div>
        </>
      )}
    </Sheet>
  );
}
