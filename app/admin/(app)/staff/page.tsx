"use client";
import { useState } from "react";
import { Copy, Check, Plus } from "lucide-react";
import { Head, Loading, Err, Table, Pill, Empty, Confirm, api, useAdmin, when } from "@/components/admin/AdminKit";
import { useStaff } from "@/components/admin/AdminShell";
import { SECTIONS, ACTIONS, ROLES, roleDefaults, type Perms, type Level, type Section, type Action, type StaffRole } from "@/lib/admin/perms";

type Member = {
  id: string; name: string; email: string; role: StaffRole; customRoleId: string | null; customRoleName: string | null; perms: Perms; effective: Perms;
  twoFactor: boolean; invited: boolean; disabled: boolean; lastLoginAt: string | null; createdAt: string;
};
type Role = { id: string; name: string; perms: Perms };
type Data = { me: { id: string; role: string; perms: Perms }; roles: Role[]; staff: Member[] };
type Editor =
  | { kind: "invite" }
  | { kind: "bulk"; ids: string[] }
  | { kind: "role"; role?: Role };

export default function AdminStaff() {
  const { edit } = useStaff();
  const { data, error, loading, reload } = useAdmin<Data>("/api/admin/staff");
  const [sel, setSel] = useState<string[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [link, setLink] = useState<{ who: string; url: string } | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; cta: string; danger?: boolean; run: () => Promise<unknown> }>(null);
  const [err, setErr] = useState("");
  const can = edit("staff");
  const others = data?.staff.filter(s => s.id !== data.me.id) ?? [];
  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  async function run(fn: () => Promise<unknown>) {
    setErr("");
    try { await fn(); setSel([]); reload(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <Head title="Staff & permissions" sub="Who can open the admin, and what each person can see and change. Changes apply right away."
        right={can ? <button className="cf-btn cf-btn--primary cf-btn--sm" onClick={() => setEditor({ kind: "invite" })}><Plus size={15} />Invite staff</button> : undefined} />
      {(error || err) && <Err msg={error || err} onRetry={error ? reload : undefined} />}
      {link && (
        <div className="sf-link">
          <div><b>Invite link for {link.who}</b><p>Send it to them yourself. It works once and expires in 72 hours. They pick a password, then set up two-step sign-in.</p></div>
          <CopyField value={link.url} />
          <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => setLink(null)}>Done</button>
        </div>
      )}
      {can && sel.length > 0 && (
        <div className="sf-bulk" role="region" aria-label="Bulk actions">
          <b className="num">{sel.length} selected</b>
          <button className="cf-btn cf-btn--sm" onClick={() => setEditor({ kind: "bulk", ids: sel })}>Change access</button>
          <button className="cf-btn cf-btn--sm" onClick={() => run(() => api("/api/admin/staff", { method: "PATCH", json: { ids: sel, enable: true } }))}>Reactivate</button>
          <button className="cf-btn cf-btn--danger cf-btn--sm" onClick={() => setConfirm({ title: `Deactivate ${sel.length} ${sel.length === 1 ? "person" : "people"}?`, body: "They're signed out right away and can't sign in until reactivated.", cta: "Deactivate", danger: true, run: () => api("/api/admin/staff", { method: "PATCH", json: { ids: sel, disable: true } }) })}>Deactivate</button>
          <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => setSel([])}>Clear</button>
        </div>
      )}
      {loading && !data ? <Loading /> : data && (
        <>
          <Table cols={[can ? "" : " ", "Person", "Role", "Two-step", "Last sign-in", ""]}
            rows={data.staff.map(s => [
              can && s.id !== data.me.id ? <input type="checkbox" aria-label={`Select ${s.name}`} checked={sel.includes(s.id)} onChange={() => toggle(s.id)} /> : <span className="ad-muted">{s.id === data.me.id ? "You" : ""}</span>,
              <div><b style={{ fontWeight: 500 }}>{s.name}</b><div className="ad-muted">{s.email}</div></div>,
              <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}><Pill k={s.role} label={s.role === "custom" ? s.customRoleName || "Custom" : undefined} />{s.disabled && <Pill k="disabled" />}{s.invited && <Pill k="invited" />}</span>,
              s.twoFactor ? <Pill k="paid" label="On" /> : <Pill k="muted" label="Not set up" />,
              <span className="ad-muted">{when(s.lastLoginAt)}</span>,
              can && s.id !== data.me.id ? <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => setEditor({ kind: "bulk", ids: [s.id] })}>Access</button>
                {s.invited && <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => run(async () => { const r = await api<{ link: string }>("/api/admin/staff", { method: "POST", json: { op: "reinvite", id: s.id } }); setLink({ who: s.name, url: r.link }); })}>New invite link</button>}
                {s.twoFactor && <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => setConfirm({ title: `Reset ${s.name}'s two-step sign-in?`, body: "Use this if they lost their phone and their recovery codes. They're signed out and set it up again at next sign-in.", cta: "Reset", run: () => api("/api/admin/staff", { method: "POST", json: { op: "reset2fa", id: s.id } }) })}>Reset 2FA</button>}
              </div> : null,
            ])} />
          {others.length === 0 && <p className="ad-muted" style={{ marginTop: 12 }}>It&apos;s just you so far. Invite someone when you&apos;re ready.</p>}

          <div className="ad-card" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div><h2>Custom roles</h2><p className="ad-card-sub">Save a set of toggles once, like Support or Accountant, and give it to many people.</p></div>
              {can && <button className="cf-btn cf-btn--sm" onClick={() => setEditor({ kind: "role" })}><Plus size={15} />New role</button>}
            </div>
            {data.roles.length === 0 ? <Empty title="No custom roles yet" /> : (
              <Table cols={["Role", "Can see", "People", ""]}
                rows={data.roles.map(r => [
                  <b style={{ fontWeight: 500 }}>{r.name}</b>,
                  <span className="ad-muted">{SECTIONS.filter(s => (r.perms.sections?.[s.key] || "hidden") !== "hidden").map(s => s.label).join(", ") || "Nothing yet"}</span>,
                  <span className="num">{data.staff.filter(s => s.customRoleId === r.id).length}</span>,
                  can ? <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => setEditor({ kind: "role", role: r })}>Edit</button>
                    <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => run(() => api("/api/admin/staff", { method: "POST", json: { op: "deleteRole", id: r.id } }))}>Delete</button>
                  </div> : null,
                ])} />
            )}
          </div>
        </>
      )}

      {editor && data && (
        <AccessEditor editor={editor} data={data} onClose={() => setEditor(null)}
          onSaved={(r) => { setEditor(null); setSel([]); if (r?.link) setLink({ who: r.who, url: r.link }); reload(); }} />
      )}
      {confirm && <Confirm title={confirm.title} body={confirm.body} cta={confirm.cta} danger={confirm.danger} onCancel={() => setConfirm(null)}
        onConfirm={async () => { await confirm.run(); setConfirm(null); setSel([]); reload(); }} />}

      <style>{STAFF_CSS}</style>
    </>
  );
}

function AccessEditor({ editor, data, onClose, onSaved }: { editor: Editor; data: Data; onClose: () => void; onSaved: (r?: { link: string; who: string }) => void }) {
  const first = editor.kind === "bulk" ? data.staff.find(s => s.id === editor.ids[0]) : undefined;
  const [name, setName] = useState(editor.kind === "role" ? editor.role?.name ?? "" : "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>(first?.role ?? "manager");
  const [customRoleId, setCustomRoleId] = useState(first?.customRoleId ?? data.roles[0]?.id ?? "");
  const [perms, setPerms] = useState<Perms>(() => {
    if (editor.kind === "role") return editor.role?.perms ?? roleDefaults("manager");
    if (first && editor.kind === "bulk" && editor.ids.length === 1) return first.effective;
    return roleDefaults("manager");
  });
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const isOwner = data.me.role === "owner";
  const mine = data.me.perms;
  const showToggles = editor.kind === "role" || role === "manager" || role === "admin";

  function pickRole(r: StaffRole) {
    setRole(r);
    if (r === "admin" || r === "manager") setPerms(roleDefaults(r));
  }
  const setSection = (k: Section, v: Level) => setPerms(p => ({ ...p, sections: { ...p.sections, [k]: v } }));
  const setAction = (k: Action, v: boolean) => setPerms(p => ({ ...p, actions: { ...p.actions, [k]: v } }));

  async function save() {
    setBusy(true); setErr("");
    try {
      if (editor.kind === "invite") {
        const r = await api<{ link: string }>("/api/admin/staff", { method: "POST", json: { op: "invite", name, email, role, customRoleId, perms: showToggles ? perms : undefined } });
        onSaved({ link: r.link, who: name });
      } else if (editor.kind === "role") {
        await api("/api/admin/staff", { method: "POST", json: { op: "saveRole", id: editor.role?.id, name, perms } });
        onSaved();
      } else {
        await api("/api/admin/staff", { method: "PATCH", json: { ids: editor.ids, role, customRoleId, perms: showToggles ? perms : undefined } });
        onSaved();
      }
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const title = editor.kind === "invite" ? "Invite staff" : editor.kind === "role" ? (editor.role ? `Edit ${editor.role.name}` : "New custom role")
    : editor.ids.length === 1 ? `Access for ${first?.name}` : `Access for ${editor.ids.length} people`;

  return (
    <div className="ad-modal-wrap" onClick={onClose}>
      <div className="ad-modal sf-ed cf-rise" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{editor.kind === "bulk" ? "Everyone changed is signed out and signs back in with their new access." : editor.kind === "role" ? "Everyone on this role gets the change right away." : "You'll get a one-time link to send them."}</p>
        {editor.kind !== "bulk" && <label className="ad-field"><span>{editor.kind === "role" ? "Role name" : "Their name"}</span><input value={name} onChange={e => setName(e.target.value)} maxLength={editor.kind === "role" ? 40 : 60} autoFocus /></label>}
        {editor.kind === "invite" && <label className="ad-field"><span>Their email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {editor.kind !== "role" && (
          <div className="ad-field"><span>Role</span>
            <div className="sf-roles">
              {ROLES.filter(r => (r.key !== "owner" || isOwner) && (r.key !== "custom" || data.roles.length > 0)).map(r => (
                <button key={r.key} type="button" className={role === r.key ? "on" : ""} onClick={() => pickRole(r.key)}><b>{r.label}</b><span>{r.note}</span></button>
              ))}
            </div>
            {role === "custom" && <select value={customRoleId} onChange={e => setCustomRoleId(e.target.value)} style={{ marginTop: 8 }}>{data.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}
          </div>
        )}
        {showToggles && (
          <>
            <div className="ad-field"><span>Sections</span>
              <div className="sf-grid">
                {SECTIONS.map(s => {
                  const max = mine.sections[s.key] || "hidden";
                  const allowed: Level[] = max === "edit" ? ["hidden", "view", "edit"] : max === "view" ? ["hidden", "view"] : ["hidden"];
                  const v = perms.sections[s.key] || "hidden";
                  return (
                    <div key={s.key} className="sf-row">
                      <span>{s.label}</span>
                      <div className="sf-seg" role="radiogroup" aria-label={s.label}>
                        {(["hidden", "view", "edit"] as Level[]).map(l => (
                          <button key={l} type="button" role="radio" aria-checked={v === l} className={v === l ? "on" : ""} disabled={!allowed.includes(l)} onClick={() => setSection(s.key, l)}>
                            {l === "hidden" ? "Hidden" : l === "view" ? "View" : "Edit"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="ad-field"><span>Sensitive actions</span>
              <div className="sf-acts">
                {ACTIONS.map(a => (
                  <label key={a.key} className={!mine.actions[a.key] ? "off" : ""}>
                    <input type="checkbox" checked={!!perms.actions[a.key]} disabled={!mine.actions[a.key]} onChange={e => setAction(a.key, e.target.checked)} />{a.label}
                  </label>
                ))}
              </div>
            </div>
            <p className="ad-muted">You can only hand out access you have yourself.</p>
          </>
        )}
        {err && <p className="ad-form-err" role="alert">{err}</p>}
        <div className="ad-modal-btns">
          <button className="cf-btn cf-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="cf-btn cf-btn--primary" onClick={save} disabled={busy}>{busy ? "Saving..." : editor.kind === "invite" ? "Create invite link" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="sf-copy">
      <input readOnly value={value} onFocus={e => e.target.select()} className="num" aria-label="Invite link" />
      <button className="cf-btn cf-btn--sm" onClick={() => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 2000); })}>{done ? <Check size={15} /> : <Copy size={15} />}{done ? "Copied" : "Copy"}</button>
    </div>
  );
}

const STAFF_CSS = `
.sf-link{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:var(--r-md);background:var(--brand-tint);border:1px solid rgba(139,92,246,0.3);margin-bottom:16px;}
.sf-link b{font-size:14px;font-weight:600;}
.sf-link p{font-size:13px;color:var(--text-2);margin-top:2px;}
.sf-link>button{align-self:flex-start;}
.sf-copy{display:flex;gap:8px;}
.sf-copy input{height:32px;font-size:12px;}
.sf-bulk{position:sticky;top:64px;z-index:5;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;margin-bottom:12px;border-radius:var(--r-md);background:var(--surface-2);border:1px solid var(--line-strong);box-shadow:0 8px 24px rgba(0,0,0,0.35);}
.sf-bulk b{font-size:13px;font-weight:500;margin-right:4px;}
@media(min-width:900px){.sf-bulk{top:16px;}}
.sf-ed{max-width:620px;max-height:calc(100vh - 32px);overflow-y:auto;}
.sf-roles{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.sf-roles button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;border-radius:var(--r-sm);border:1px solid var(--line-strong);background:var(--surface-3);color:var(--text);text-align:left;}
.sf-roles button b{font-size:13.5px;font-weight:500;}
.sf-roles button span{font-size:12px;color:var(--text-3);line-height:1.35;}
.sf-roles button.on{border-color:var(--brand);background:var(--brand-tint);}
.sf-grid{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:var(--r-sm);}
.sf-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 6px 6px 12px;border-bottom:1px solid var(--line);font-size:13.5px;}
.sf-row:last-child{border-bottom:none;}
.sf-seg{display:flex;gap:2px;background:var(--surface-3);border-radius:7px;padding:2px;flex-shrink:0;}
.sf-seg button{height:26px;padding:0 9px;border:none;border-radius:5px;background:none;color:var(--text-2);font-size:12px;}
.sf-seg button.on{background:var(--brand);color:#fff;}
.sf-seg button[disabled]{opacity:.3;cursor:not-allowed;}
.sf-acts{display:grid;gap:6px;}
@media(min-width:560px){.sf-acts{grid-template-columns:1fr 1fr;}}
.sf-acts label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-2);cursor:pointer;}
.sf-acts label.off{opacity:.4;cursor:not-allowed;}
`;
