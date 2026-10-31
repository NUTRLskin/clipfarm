"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Copy, Check } from "lucide-react";
import Logo from "@/components/site/Logo";
import { api } from "./AdminKit";

type Mode = "login" | "setup" | "invite";
type Step = "creds" | "code" | "enroll" | "codes";

/**
 * Staff sign-in, first-Owner setup and invite acceptance. Every path ends in two-step sign-in:
 * password first, then a code from an authenticator app (set up on first sign-in).
 */
export default function AdminAuth({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const next = params.get("next")?.startsWith("/admin") ? params.get("next")! : "/admin";

  const [step, setStep] = useState<Step>("creds");
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState("");
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [password2, setPassword2] = useState("");
  const [code, setCode] = useState(""), [useRecovery, setUseRecovery] = useState(false);
  const [qr, setQr] = useState<{ qr: string; secret: string } | null>(null);
  const [recovery, setRecovery] = useState<string[]>([]);
  const [copied, setCopied] = useState(false), [saved, setSaved] = useState(false);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await api<{ me: unknown; setupOpen: boolean; noStaff: boolean }>(`/api/admin/auth/state${token ? `?token=${encodeURIComponent(token)}` : ""}`);
        if (s.me) { router.replace(next); return; }
        if (mode === "login" && s.noStaff) { router.replace("/admin/setup"); return; }
        if (mode === "setup" && !s.noStaff) { router.replace("/admin/login"); return; }
        if (mode === "setup" && !s.setupOpen) setBlocked("Create the first Owner from the computer that runs Clip Farm (open localhost), or add ?token= with the ADMIN_SETUP_TOKEN.");
        if (mode === "invite") {
          const inv = await api<{ email: string; name: string }>(`/api/admin/auth/invite?token=${encodeURIComponent(token)}`);
          setEmail(inv.email); setName(inv.name);
        }
      } catch (e: any) { setBlocked(e.message); }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function afterPassword(r: { next: "code" | "enroll" }) {
    setPassword(""); setPassword2("");
    if (r.next === "enroll") { setQr(await api("/api/admin/auth/enroll")); setStep("enroll"); }
    else setStep("code");
  }

  async function submitCreds(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (mode !== "login" && password !== password2) { setErr("The two passwords don't match."); return; }
    setBusy(true);
    try {
      if (mode === "login") await afterPassword(await api("/api/admin/auth/login", { method: "POST", json: { email, password } }));
      else if (mode === "setup") await afterPassword(await api("/api/admin/auth/setup", { method: "POST", json: { name, email, password, token } }));
      else await afterPassword(await api("/api/admin/auth/invite", { method: "POST", json: { token, password } }));
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      if (step === "enroll") {
        const r = await api<{ recoveryCodes: string[] }>("/api/admin/auth/enroll", { method: "POST", json: { code } });
        setRecovery(r.recoveryCodes); setStep("codes");
      } else {
        await api("/api/admin/auth/verify", { method: "POST", json: useRecovery ? { recovery: code } : { code } });
        router.replace(next);
      }
    } catch (e: any) {
      setErr(e.message);
      if (e.status === 401) { setStep("creds"); setCode(""); }
    }
    setBusy(false);
  }

  function copyCodes() {
    navigator.clipboard?.writeText(recovery.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }

  const title = step === "enroll" ? "Turn on two-step sign-in" : step === "codes" ? "Save your recovery codes" : step === "code" ? "Enter your code"
    : mode === "setup" ? "Create the Owner account" : mode === "invite" ? `Welcome, ${name.split(" ")[0] || "there"}` : "Staff sign in";
  const sub = step === "enroll" ? "Scan this with an authenticator app (Google Authenticator, 1Password or Authy), then type the 6-digit code it shows."
    : step === "codes" ? "Each code works once if you lose your phone. Store them in your password manager. You won't see them again."
    : step === "code" ? (useRecovery ? "Type one of the recovery codes you saved." : "Open your authenticator app and type the 6-digit code for Clip Farm Admin.")
    : mode === "setup" ? "This is the first and most powerful account. You can invite other staff after you sign in."
    : mode === "invite" ? "Pick a password for your staff account. Next you'll set up two-step sign-in."
    : "For Clip Farm staff only. Clippers and streamers sign in on the main site.";

  return (
    <div className="aa">
      <div className="aa-card cf-rise">
        <div className="aa-brand"><Logo size={20} /><span className="aa-tag">Admin</span></div>
        {!ready ? <div className="aa-skel" /> : blocked ? (
          <>
            <h1>{mode === "invite" ? "This invite isn't working" : "Setup is locked"}</h1>
            <p className="aa-sub">{blocked}</p>
            <Link href="/admin/login" className="cf-btn cf-btn--lg cf-btn--full" style={{ marginTop: 20 }}>Go to staff sign in</Link>
          </>
        ) : (
          <>
            <div className="aa-steps" aria-hidden="true">
              <span className={step === "creds" ? "on" : "done"} /><span className={step === "code" || step === "enroll" ? "on" : step === "codes" ? "done" : ""} />{mode !== "login" && <span className={step === "codes" ? "on" : ""} />}
            </div>
            <h1>{title}</h1>
            <p className="aa-sub">{sub}</p>

            {step === "creds" && (
              <form onSubmit={submitCreds} className="aa-form">
                {mode === "setup" && <label className="aa-f"><span>Your name</span><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required maxLength={60} autoFocus /></label>}
                <label className="aa-f"><span>Work email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required readOnly={mode === "invite"} autoFocus={mode === "login"} /></label>
                <label className="aa-f"><span>{mode === "login" ? "Password" : "Create a password"}</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required autoFocus={mode === "invite"} /></label>
                {mode !== "login" && <>
                  <label className="aa-f"><span>Type it again</span><input type="password" value={password2} onChange={e => setPassword2(e.target.value)} autoComplete="new-password" required /></label>
                  <p className="aa-hint">At least 12 characters, with a letter and a number. A password manager makes this easy.</p>
                </>}
                {err && <p className="aa-err" role="alert">{err}</p>}
                <button className="cf-btn cf-btn--primary cf-btn--lg cf-btn--full" disabled={busy}>{busy ? "Checking..." : mode === "login" ? "Continue" : "Create and continue"}</button>
              </form>
            )}

            {(step === "code" || step === "enroll") && (
              <form onSubmit={submitCode} className="aa-form">
                {step === "enroll" && qr && (
                  <div className="aa-qr">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr.qr} alt="QR code for your authenticator app" width={200} height={200} />
                    <details><summary>Can&apos;t scan? Type this key instead</summary><code className="num">{qr.secret.match(/.{1,4}/g)?.join(" ")}</code></details>
                  </div>
                )}
                <label className="aa-f"><span>{useRecovery ? "Recovery code" : "6-digit code"}</span>
                  {useRecovery
                    ? <input value={code} onChange={e => setCode(e.target.value)} autoComplete="off" required autoFocus className="num" />
                    : <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" required autoFocus className="num aa-code" placeholder="000000" />}
                </label>
                {err && <p className="aa-err" role="alert">{err}</p>}
                <button className="cf-btn cf-btn--primary cf-btn--lg cf-btn--full" disabled={busy}>{busy ? "Checking..." : step === "enroll" ? "Turn on and sign in" : "Sign in"}</button>
                {step === "code" && <button type="button" className="aa-link" onClick={() => { setUseRecovery(u => !u); setCode(""); setErr(""); }}>{useRecovery ? "Use my authenticator app instead" : "Lost your phone? Use a recovery code"}</button>}
              </form>
            )}

            {step === "codes" && (
              <div className="aa-form">
                <ul className="aa-codes num">{recovery.map(c => <li key={c}>{c}</li>)}</ul>
                <button type="button" className="cf-btn cf-btn--full" onClick={copyCodes}>{copied ? <><Check size={16} />Copied</> : <><Copy size={16} />Copy all codes</>}</button>
                <label className="aa-check"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} /><span>I saved these codes somewhere safe.</span></label>
                <button className="cf-btn cf-btn--primary cf-btn--lg cf-btn--full" disabled={!saved} onClick={() => router.replace(next)}>Open the dashboard</button>
              </div>
            )}
          </>
        )}
        <p className="aa-foot"><ShieldCheck size={14} />Every staff sign-in and action is logged.</p>
      </div>
      {mode === "login" && <Link href={process.env.NEXT_PUBLIC_APP_URL || "/"} className="aa-back">Back to Clip Farm</Link>}
      <style>{AUTH_CSS}</style>
    </div>
  );
}

const AUTH_CSS = `
.aa{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:32px 16px;background:var(--bg);}
.aa-card{width:100%;max-width:420px;background:var(--surface-1);border:1px solid var(--line);border-radius:var(--r-lg);padding:28px 24px;}
@media(min-width:480px){.aa-card{padding:36px 36px 28px;}}
.aa-brand{display:flex;align-items:center;gap:10px;margin-bottom:28px;}
.aa-tag{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--brand-400);background:var(--brand-tint);padding:3px 7px;border-radius:6px;}
.aa-steps{display:flex;gap:6px;margin-bottom:16px;}
.aa-steps span{height:3px;flex:1;max-width:40px;border-radius:2px;background:var(--surface-3);}
.aa-steps span.on{background:var(--brand);}
.aa-steps span.done{background:var(--brand-400);opacity:.5;}
.aa h1{font-size:22px;line-height:28px;font-weight:600;letter-spacing:-0.02em;}
.aa-sub{font-size:14px;color:var(--text-2);margin-top:6px;}
.aa-form{display:flex;flex-direction:column;gap:14px;margin-top:22px;}
.aa-f{display:flex;flex-direction:column;gap:6px;}
.aa-f>span{font-size:13px;font-weight:500;color:var(--text-2);}
.aa-f input{height:44px;font-size:15px;}
.aa-f input[readonly]{color:var(--text-2);}
.aa-code{font-size:22px!important;letter-spacing:.3em;text-align:center;}
.aa-hint{font-size:12.5px;color:var(--text-3);margin-top:-4px;}
.aa-err{font-size:13.5px;color:var(--danger);background:var(--danger-tint);padding:10px 12px;border-radius:var(--r-sm);}
.aa-qr{display:flex;flex-direction:column;align-items:center;gap:12px;}
.aa-qr img{border-radius:12px;background:#fff;padding:8px;width:200px;height:200px;}
.aa-qr details{font-size:13px;color:var(--text-2);text-align:center;}
.aa-qr summary{cursor:pointer;}
.aa-qr code{display:block;margin-top:8px;font-size:13px;color:var(--text);word-break:break-all;background:var(--surface-2);padding:8px 10px;border-radius:8px;}
.aa-codes{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px;border-radius:var(--r-md);background:var(--surface-2);border:1px solid var(--line);font-size:14px;}
.aa-codes li{text-align:center;}
.aa-check{display:flex;gap:10px;align-items:center;font-size:14px;color:var(--text-2);cursor:pointer;}
.aa-link{background:none;border:none;color:var(--brand-400);font-size:13.5px;align-self:center;padding:4px;}
.aa-foot{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:var(--text-3);margin-top:24px;padding-top:16px;border-top:1px solid var(--line);}
.aa-back{font-size:13px;color:var(--text-3);}
.aa-back:hover{color:var(--text-2);}
.aa-skel{height:220px;border-radius:var(--r-md);background:var(--surface-2);animation:aap 1.4s ease-in-out infinite;}
@keyframes aap{50%{opacity:.5}}
`;
