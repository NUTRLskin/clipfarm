"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AuthFrame from "@/components/site/AuthFrame";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    setBusy(true);
    const r = await fetch("/api/account/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(j.error || "Something went wrong. Try again."); return; }
    setDone(true);
  }

  return (
    <AuthFrame title="Set a new password">
      {done ? (
        <>
          <p className="af-msg ok">Your password is changed. Log in with the new one.</p>
          <Link href="/login" className="cf-btn cf-btn--primary cf-btn--lg cf-btn--full" style={{ marginTop: 16 }}>Log in</Link>
        </>
      ) : !token ? (
        <p className="af-msg err">This page needs the link from your reset email. <Link href="/forgot-password" style={{ textDecoration: "underline" }}>Ask for a new link</Link>.</p>
      ) : (
        <form className="af-form" onSubmit={submit}>
          <label className="af-field">New password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="8+ characters, a letter and a number" required /></label>
          <label className="af-field">Type it again<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required /></label>
          {error && <p className="af-msg err" role="alert">{error}</p>}
          <button className="cf-btn cf-btn--primary cf-btn--lg cf-btn--full" disabled={busy}>{busy ? "Saving..." : "Save new password"}</button>
        </form>
      )}
      {!done && <Link href="/login" className="af-back">Back to log in</Link>}
    </AuthFrame>
  );
}
