"use client";
import { useState } from "react";
import Link from "next/link";
import AuthFrame from "@/components/site/AuthFrame";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await fetch("/api/account/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(j.error || "Something went wrong. Try again."); return; }
    setSent(true);
  }

  return (
    <AuthFrame title="Reset your password" sub="Enter your account email and we'll send you a link to set a new password.">
      {sent ? (
        <p className="af-msg ok">If there&apos;s an account for <b>{email}</b>, a reset link is on its way. It works once, for 1 hour. Check your spam folder too.</p>
      ) : (
        <form className="af-form" onSubmit={submit}>
          <label className="af-field">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
          {error && <p className="af-msg err" role="alert">{error}</p>}
          <button className="cf-btn cf-btn--primary cf-btn--lg cf-btn--full" disabled={busy || !email}>{busy ? "Sending..." : "Send reset link"}</button>
        </form>
      )}
      <Link href="/login" className="af-back">Back to log in</Link>
    </AuthFrame>
  );
}
