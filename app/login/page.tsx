"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Scissors, Radio, Eye, EyeOff, ChevronDown } from "lucide-react";
import Logo from "@/components/site/Logo";
import { SITE } from "@/lib/site";

type Side = "clipper" | "streamer";
type Mode = "signup" | "login";

const RATE = (SITE.rateCents / 100).toFixed(2);
const STREAMER_PAYS = ((SITE.rateCents / 100) * (1 + SITE.feePct / 100)).toFixed(2);

/**
 * Two doors. Clippers sign in with TikTok (email is the backup); streamers sign in with Twitch.
 * Each sign-in makes one kind of account. Terms are accepted on the first screen after sign-in
 * (or here, for email sign-up), with the rate written out.
 */
export default function LoginPage() {
  const router = useRouter();
  const [side, setSide] = useState<Side | null>(null);
  const [providers, setProviders] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const s = q.get("side") || q.get("intent");
    if (s === "clipper") setSide("clipper");
    if (s === "streamer" || s === "creator") setSide("streamer");
    fetch("/api/auth/providers").then(r => r.json()).then(setProviders).catch(() => setProviders({}));
  }, []);

  function pick(s: Side | null) {
    setSide(s);
    const u = new URL(window.location.href);
    if (s) u.searchParams.set("side", s); else u.searchParams.delete("side");
    u.searchParams.delete("intent");
    router.replace(u.pathname + u.search, { scroll: false });
  }

  return (
    <div className="lg">
      <header className="lg-top"><Link href="/" aria-label="Clip Farm home"><Logo size={20} /></Link></header>
      <main className="lg-main">
        <div className="lg-card cf-rise" key={side || "pick"}>
          {!side ? <Chooser onPick={pick} /> : side === "clipper"
            ? <ClipperDoor providers={providers} onBack={() => pick(null)} />
            : <StreamerDoor providers={providers} onBack={() => pick(null)} />}
        </div>
      </main>
      <style>{LOGIN_CSS}</style>
    </div>
  );
}

function Chooser({ onPick }: { onPick: (s: Side) => void }) {
  return (
    <>
      <h1 className="cf-h1">Log in to Clip Farm.</h1>
      <p className="cf-sub" style={{ marginTop: 6 }}>Pick your side. New here? Same buttons. We&apos;ll set you up.</p>
      <div className="lg-doors">
        <button className="lg-door" onClick={() => onPick("clipper")}>
          <span className="lg-ic"><Scissors size={20} /></span>
          <span className="lg-door-t">I&apos;m a clipper</span>
          <span className="lg-door-b">Log in with TikTok. Clip streamers, get paid <b className="num money">${RATE}</b> per 1,000 views.</span>
          <ArrowRight size={18} className="lg-door-go" />
        </button>
        <button className="lg-door" onClick={() => onPick("streamer")}>
          <span className="lg-ic"><Radio size={20} /></span>
          <span className="lg-door-t">I&apos;m a Twitch streamer</span>
          <span className="lg-door-b">Log in with Twitch. Get clipped, pay only for verified views.</span>
          <ArrowRight size={18} className="lg-door-go" />
        </button>
      </div>
      <p className="lg-note">Doing both? Use a separate account for each side.</p>
    </>
  );
}

function Back({ onBack }: { onBack: () => void }) {
  return <button className="lg-back" onClick={onBack}><ArrowLeft size={15} />Clipper or streamer</button>;
}

function NotReady({ what }: { what: string }) {
  return <p className="lg-wait">{what} sign-in is being switched on. {what === "TikTok" ? "Use email below for now." : "Check back soon."}</p>;
}

function ClipperDoor({ providers, onBack }: { providers: Record<string, unknown> | null; onBack: () => void }) {
  const router = useRouter();
  const tiktok = !!providers?.tiktok, demo = !!providers?.["clipper-demo"], email = !!providers?.password;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState(""), [addr, setAddr] = useState(""), [password, setPassword] = useState("");
  const [show, setShow] = useState(false), [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (providers && !tiktok) setOpen(true); }, [providers, tiktok]);

  async function passwordSignIn(dest: string) {
    const res = await signIn("password", { email: addr, password, redirect: false });
    if (!res || res.error) return false;
    router.push(dest); router.refresh();
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (mode === "signup") {
      if (!agreed) { setError("Tick the box to confirm you're 18+ and agree to the rules."); return; }
      setBusy(true);
      const r = await fetch("/api/account/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email: addr, password, role: "clipper", agree: true }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setBusy(false); setError(j.error || "Couldn't create your account. Try again."); return; }
      if (!(await passwordSignIn("/settings?welcome=1"))) { setBusy(false); setError("Account created. Log in to continue."); setMode("login"); }
      return;
    }
    setBusy(true);
    if (!(await passwordSignIn("/dashboard"))) { setBusy(false); setError("That email and password don't match. Try again or reset your password."); }
  }

  return (
    <>
      <Back onBack={onBack} />
      <span className="lg-eyebrow">Clipper</span>
      <h1 className="cf-h1">Clip streamers. Get paid.</h1>
      <div className="lg-rate">
        <div><span className="num money lg-rate-v">${RATE}</span><span className="lg-rate-u">per 1,000 verified views</span></div>
        <p>Every contract pays the same. You keep all of it.</p>
      </div>

      <div className="lg-alt">
        <button className="cf-btn cf-btn--primary cf-btn--lg cf-btn--full lg-oauth" disabled={!tiktok} onClick={() => signIn("tiktok", { callbackUrl: "/dashboard" })}>
          <TikTokIcon />Continue with TikTok
        </button>
        {providers && !tiktok && <NotReady what="TikTok" />}
        {demo && <button className="cf-btn cf-btn--full" onClick={() => signIn("clipper-demo", { callbackUrl: "/dashboard" })}>Try the demo clipper (sample data)</button>}
      </div>
      <p className="lg-note">We only post to TikTok when you press Post. Never on our own. Signing in with TikTok proves the clips are yours.</p>

      {email && (
        <div className={`lg-more ${open ? "open" : ""}`}>
          <button className="lg-more-h" onClick={() => setOpen(o => !o)} aria-expanded={open}>Use email instead<ChevronDown size={16} /></button>
          {open && (
            <form onSubmit={submit} className="lg-form" noValidate>
              <div className="lg-seg" role="tablist">
                <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "on" : ""} onClick={() => { setMode("login"); setError(null); }}>Log in</button>
                <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setError(null); }}>Create account</button>
              </div>
              {mode === "signup" && <label className="lg-field"><span>Your name</span><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Alex Rivera" required /></label>}
              <label className="lg-field"><span>Email</span><input type="email" value={addr} onChange={e => setAddr(e.target.value)} autoComplete="email" placeholder="you@example.com" required /></label>
              <label className="lg-field">
                <span>Password {mode === "login" && <Link href="/forgot-password" className="lg-forgot">Forgot it?</Link>}</span>
                <span className="lg-pw">
                  <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "8+ characters, a letter and a number" : ""} required />
                  <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </span>
              </label>
              {mode === "signup" && (
                <>
                  <ul className="lg-rules">
                    <li>Every contract pays <b className="num">${RATE}</b> per 1,000 verified views.</li>
                    <li>Views count for {SITE.viewWindowDays} days after you send a clip. Earnings wait {SITE.holdDays} days for checks, then pay out {SITE.payoutDay}s once you have ${SITE.minPayout}.</li>
                    <li>Only post to your own accounts. Fake or bought views mean no pay and a ban.</li>
                  </ul>
                  <label className="lg-agree">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                    <span>I&apos;m 18 or older and agree to these rules, the <Link href="/legal/terms" target="_blank">Terms</Link>, <Link href="/legal/clipper-terms" target="_blank">Clipper Terms</Link> and <Link href="/legal/privacy" target="_blank">Privacy Policy</Link>.</span>
                  </label>
                </>
              )}
              {error && <p className="lg-err" role="alert">{error}</p>}
              <button type="submit" className="cf-btn cf-btn--lg cf-btn--full" disabled={busy}>
                {busy ? "One sec..." : mode === "signup" ? "Create account" : "Log in"}{!busy && <ArrowRight size={17} />}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

function StreamerDoor({ providers, onBack }: { providers: Record<string, unknown> | null; onBack: () => void }) {
  const twitch = !!providers?.twitch, demo = !!providers?.["creator-demo"];
  return (
    <>
      <Back onBack={onBack} />
      <span className="lg-eyebrow">Streamer</span>
      <h1 className="cf-h1">Get clipped. Pay for views.</h1>
      <div className="lg-rate">
        <div><span className="num lg-rate-v">${STREAMER_PAYS}</span><span className="lg-rate-u">per 1,000 verified views</span></div>
        <p>Clippers earn ${RATE} and Clip Farm&apos;s fee is {SITE.feePct}% on top. Prepay a budget from ${SITE.minBudget}. Unspent budget is refundable.</p>
      </div>
      <div className="lg-alt">
        <button className="cf-btn cf-btn--primary cf-btn--lg cf-btn--full lg-oauth lg-twitch" disabled={!twitch} onClick={() => signIn("twitch", { callbackUrl: "/my-campaigns" })}>
          <TwitchIcon />Continue with Twitch
        </button>
        {providers && !twitch && <NotReady what="Twitch" />}
        {demo && <button className="cf-btn cf-btn--full" onClick={() => signIn("creator-demo", { callbackUrl: "/my-campaigns" })}>Try the demo streamer (sample data)</button>}
      </div>
      <p className="lg-note">Twitch sign-in tells us which channel is yours, so nobody can post a contract for your stream. We never post to Twitch or touch your chat.</p>
    </>
  );
}

function TwitchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" /></svg>;
}
function TikTokIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>;
}

const LOGIN_CSS = `
.lg{min-height:100vh;background:var(--bg);display:flex;flex-direction:column;}
.lg-top{height:64px;display:flex;align-items:center;padding:0 16px;max-width:1200px;width:100%;margin:0 auto;}
.lg-main{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px 64px;}
.lg-card{width:100%;max-width:440px;}
.lg-doors{display:grid;gap:12px;margin-top:28px;}
.lg-door{position:relative;display:grid;grid-template-columns:44px 1fr;column-gap:14px;row-gap:3px;text-align:left;padding:18px 48px 18px 16px;border-radius:16px;border:1px solid var(--line-strong);background:var(--surface-1);color:var(--text);transition:border-color .15s var(--ease),background .15s var(--ease),transform .15s var(--ease);}
.lg-door:hover{border-color:var(--brand);background:var(--brand-tint);}
.lg-door:active{transform:translateY(1px);}
.lg-ic{grid-row:span 2;width:44px;height:44px;border-radius:12px;background:var(--brand-tint);display:flex;align-items:center;justify-content:center;color:var(--brand-400);}
.lg-door-t{font-size:16px;font-weight:600;}
.lg-door-b{font-size:13.5px;color:var(--text-2);line-height:1.5;}
.lg-door-b b{font-weight:500;}
.lg-door-go{position:absolute;right:16px;top:50%;transform:translateY(-50%);color:var(--text-3);}
.lg-door:hover .lg-door-go{color:var(--brand-400);}
.lg-back{display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:var(--text-3);font-size:13px;padding:4px 0;margin-bottom:20px;}
.lg-back:hover{color:var(--text);}
.lg-eyebrow{display:block;font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-400);margin-bottom:6px;}
.lg-rate{margin:20px 0 24px;padding:16px;border-radius:14px;background:var(--surface-1);border:1px solid var(--line);}
.lg-rate>div{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.lg-rate-v{font-size:30px;line-height:36px;font-weight:500;}
.lg-rate-u{font-size:14px;color:var(--text-2);}
.lg-rate p{font-size:13px;color:var(--text-3);margin-top:4px;}
.lg-alt{display:grid;gap:10px;}
.lg-oauth{gap:10px;}
.lg-wait{font-size:13px;color:var(--text-2);background:var(--surface-2);border:1px solid var(--line);padding:10px 12px;border-radius:10px;}
.lg-note{margin-top:16px;font-size:12.5px;color:var(--text-3);line-height:1.55;}
.lg-more{margin-top:24px;border-top:1px solid var(--line);}
.lg-more-h{display:flex;align-items:center;justify-content:space-between;width:100%;background:none;border:none;color:var(--text-2);font-size:14px;font-weight:500;padding:16px 0 4px;}
.lg-more-h svg{transition:transform .2s var(--ease);}
.lg-more.open .lg-more-h svg{transform:rotate(180deg);}
.lg-seg{display:flex;gap:4px;background:var(--surface-2);border-radius:10px;padding:3px;}
.lg-seg button{flex:1;height:34px;border:none;border-radius:8px;background:none;color:var(--text-2);font-size:13.5px;font-weight:500;}
.lg-seg button.on{background:var(--surface-4);color:var(--text);}
.lg-form{display:grid;gap:14px;margin-top:12px;}
.lg-field{display:grid;gap:6px;}
.lg-field>span:first-child{display:flex;justify-content:space-between;font-size:13px;font-weight:500;color:var(--text-2);}
.lg-field input{height:46px;font-size:15px;}
.lg-forgot{font-weight:400;color:var(--brand-400);}
.lg-pw{position:relative;display:block;}
.lg-pw input{padding-right:46px;}
.lg-pw button{position:absolute;right:4px;top:4px;width:38px;height:38px;border:none;background:none;color:var(--text-3);display:flex;align-items:center;justify-content:center;border-radius:8px;}
.lg-pw button:hover{color:var(--text);}
.lg-rules{display:grid;gap:6px;padding:12px 14px 12px 30px;border-radius:10px;background:var(--surface-1);border:1px solid var(--line);font-size:13px;color:var(--text-2);line-height:1.5;}
.lg-rules b{font-weight:500;color:var(--text);}
.lg-agree{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--text-2);cursor:pointer;}
.lg-agree input{margin-top:3px;width:16px;height:16px;flex-shrink:0;}
.lg-agree a{color:var(--brand-400);}
.lg-err{font-size:13.5px;color:var(--warn);background:var(--warn-tint);padding:10px 12px;border-radius:10px;}
@media(min-width:768px){.lg-main{align-items:center;padding-bottom:96px;}.lg-top{padding:0 24px;}}
`;
