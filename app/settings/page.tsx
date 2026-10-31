"use client";
import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { CheckCircle2, Download, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { PageHeader, Btn, Advanced } from "@/components/ui";
import { Page, ErrorState, ListSkeleton, Toast, getJSON, ic } from "@/components/PageKit";

type Profile = {
  id: string; email: string | null; name: string | null; username: string | null; role: string; bio: string | null;
  tiktokHandle: string | null; instagramHandle: string | null; youtubeHandle: string | null; country: string | null;
  hasPassword: boolean; complete: boolean; createdAt: string; tiktokConnected: boolean; twitchConnected: boolean;
};
type Form = { name: string; username: string; tiktokHandle: string; instagramHandle: string; youtubeHandle: string; bio: string; country: string };
const toForm = (p: Profile): Form => ({ name: p.name || "", username: p.username || "", tiktokHandle: p.tiktokHandle || "", instagramHandle: p.instagramHandle || "", youtubeHandle: p.youtubeHandle || "", bio: p.bio || "", country: p.country || "US" });

export default function SettingsPage() {
  const [p, setP] = useState<Profile | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);

  function load() {
    setLoadErr(null);
    getJSON<Profile>("/api/account/profile").then(x => { setP(x); setF(toForm(x)); }).catch(e => setLoadErr(e.message));
  }
  useEffect(() => { setWelcome(new URLSearchParams(window.location.search).get("welcome") === "1"); load(); }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF(v => v && { ...v, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setSaving(true); setSaveErr(null);
    const r = await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setSaveErr(j.error || "Couldn't save. Try again."); return; }
    setP(j); setF(toForm(j));
    flash(j.complete && welcome ? "Profile done. You're ready to clip." : "Saved.");
  }

  return (
    <AppShell>
      <Page>
        <PageHeader title={welcome ? "Set up your profile" : "Settings"} sub={welcome ? "Takes a minute. Streamers see this when you submit clips." : "Your profile, password and data."} />
        {loadErr && <ErrorState title="Couldn't load your profile" message={loadErr} onRetry={load} />}
        {!p && !loadErr && <ListSkeleton rows={4} height={64} />}

        {p && f && (
          <div className="st-wrap">
            <form className="cf-card st-sec" onSubmit={save}>
              <h2 className="cf-h2">Profile</h2>
              {!p.complete && <p className="st-hint">Add your name, a username and your TikTok handle to start submitting clips.</p>}
              <div className="st-grid">
                <Field label="Name"><input value={f.name} onChange={set("name")} autoComplete="name" required /></Field>
                <Field label="Username" hint="3–24 letters, numbers or _"><div className="st-pre"><span>@</span><input value={f.username} onChange={set("username")} autoCapitalize="none" placeholder="yourname" /></div></Field>
                <Field label="TikTok handle" hint="The account you'll post clips from"><div className="st-pre"><span>@</span><input value={f.tiktokHandle} onChange={set("tiktokHandle")} autoCapitalize="none" placeholder="yourtiktok" /></div></Field>
                <Field label="Email"><input value={p.email || "Signed in with Twitch/TikTok"} disabled /></Field>
              </div>
              <Advanced label="More about you (optional)">
                <div className="st-grid">
                  <Field label="Instagram handle"><div className="st-pre"><span>@</span><input value={f.instagramHandle} onChange={set("instagramHandle")} autoCapitalize="none" /></div></Field>
                  <Field label="YouTube handle"><div className="st-pre"><span>@</span><input value={f.youtubeHandle} onChange={set("youtubeHandle")} autoCapitalize="none" /></div></Field>
                  <Field label="Country"><select value={f.country} onChange={set("country")}><option value="US">United States</option></select></Field>
                </div>
                <Field label="Bio" hint="Up to 280 characters"><textarea value={f.bio} onChange={set("bio")} rows={3} maxLength={280} /></Field>
              </Advanced>
              {saveErr && <p className="st-err" role="alert">{saveErr}</p>}
              <div className="st-actions"><Btn primary type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Btn></div>
            </form>

            <ConnectedCard tiktok={p.tiktokConnected} twitch={p.twitchConnected} />

            <PasswordCard email={p.email} hasPassword={p.hasPassword} onDone={() => { setP({ ...p, hasPassword: true }); flash("Password updated. Other devices were signed out."); }} />

            <section className="cf-card st-sec">
              <h2 className="cf-h2">Your data</h2>
              <p className="cf-sub" style={{ marginTop: 4 }}>Download a copy of everything we hold about you, or delete your account.</p>
              <div className="st-actions" style={{ justifyContent: "flex-start" }}>
                <a className="cf-btn" href="/api/account/export" download><Download {...ic} />Download my data</a>
              </div>
              <Advanced label="Delete account"><DeleteAccount /></Advanced>
            </section>
          </div>
        )}
        {toast && <Toast><CheckCircle2 {...ic} style={{ color: "var(--brand-400)", flexShrink: 0 }} />{toast}</Toast>}
      </Page>
      <style>{`
        .st-wrap{display:grid;gap:16px;max-width:720px;}
        .st-sec{padding:20px;}
        .st-hint{margin-top:8px;font-size:13.5px;color:var(--warn);background:var(--warn-tint);padding:10px 12px;border-radius:10px;}
        .st-grid{display:grid;gap:14px;margin-top:18px;}
        .st-f{display:grid;gap:6px;}
        .st-f>span{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:500;color:var(--text-2);}
        .st-f>span small{font-weight:400;color:var(--text-3);font-size:12px;}
        .st-f input,.st-f select{height:44px;}
        .st-f input:disabled{opacity:.6;}
        .st-pre{position:relative;}
        .st-pre span{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);font-size:14px;}
        .st-pre input{padding-left:28px;}
        .st-err{margin-top:14px;font-size:13.5px;color:var(--warn);background:var(--warn-tint);padding:10px 12px;border-radius:10px;}
        .st-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px;}
        @media(min-width:768px){.st-grid{grid-template-columns:1fr 1fr;}.st-sec{padding:24px;}}
      `}</style>
    </AppShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="st-f"><span>{label}{hint && <small>{hint}</small>}</span>{children}</label>;
}

function PasswordCard({ email, hasPassword, onDone }: { email: string | null; hasPassword: boolean; onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || "Couldn't change it. Try again."); return; }
    // Changing the password signs out every session, so sign this one back in with the new one.
    if (email) await signIn("password", { email, password: next, redirect: false });
    setCurrent(""); setNext(""); onDone();
  }
  if (!email) return null;
  return (
    <form className="cf-card st-sec" onSubmit={submit}>
      <h2 className="cf-h2">{hasPassword ? "Change password" : "Set a password"}</h2>
      <div className="st-grid">
        {hasPassword && <Field label="Current password"><input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" required /></Field>}
        <Field label="New password" hint="8+ characters, a letter and a number"><input type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" required /></Field>
      </div>
      {err && <p className="st-err" role="alert">{err}</p>}
      <div className="st-actions"><Btn type="submit" disabled={busy || !next}>{busy ? "Saving..." : "Update password"}</Btn></div>
    </form>
  );
}

/** Link TikTok (clip ownership + view counts) or Twitch (streamer tools) to this same account. */
function ConnectedCard({ tiktok, twitch }: { tiktok: boolean; twitch: boolean }) {
  const [providers, setProviders] = useState<Record<string, unknown>>({});
  useEffect(() => { fetch("/api/auth/providers").then(r => r.json()).then(setProviders).catch(() => {}); }, []);
  const rows = [
    { id: "tiktok", name: "TikTok", on: tiktok, why: "Proves your clips are yours and reads their views." },
    { id: "twitch", name: "Twitch", on: twitch, why: "For streamers: post contracts for your channel." },
  ].filter(r => r.on || providers[r.id]);
  if (!rows.length) return null;
  async function connect(id: string) {
    await fetch("/api/account/link", { method: "POST" });
    signIn(id, { callbackUrl: "/settings" });
  }
  return (
    <section className="cf-card st-sec">
      <h2 className="cf-h2">Connected accounts</h2>
      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        {rows.map(r => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500 }}>{r.name}</div><div className="cf-sub" style={{ fontSize: 13 }}>{r.why}</div></div>
            {r.on ? <span style={{ fontSize: 13, color: "var(--brand-400)" }}>Connected</span> : <Btn small onClick={() => connect(r.id)}>Connect {r.name}</Btn>}
          </div>
        ))}
      </div>
    </section>
  );
}

function DeleteAccount() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function del() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/account/profile", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: text }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setErr(j.error || "Couldn't delete. Try again."); return; }
    try { localStorage.removeItem("cf-role"); } catch {}
    signOut({ callbackUrl: "/" });
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p className="cf-sub" style={{ lineHeight: 1.6 }}>This wipes your profile and signs you out for good. Records of clips and payments stay, without your name, because tax and fraud rules require it. If you have unpaid earnings, contact support before deleting.</p>
      <Field label='Type DELETE to confirm'><input value={text} onChange={e => setText(e.target.value)} autoCapitalize="characters" /></Field>
      {err && <p className="st-err" role="alert">{err}</p>}
      <div><Btn danger onClick={del} disabled={busy || text !== "DELETE"}><Trash2 {...ic} />{busy ? "Deleting..." : "Delete my account"}</Btn></div>
    </div>
  );
}
