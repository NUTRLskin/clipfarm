"use client";
import { useCallback, useEffect, useState } from "react";
import type { Perms } from "@/lib/admin/perms";

/** Shared pieces for the admin screens. Same tokens as the app; denser tables, no marketing flourishes. */

export type AdminMe = { id: string; name: string; email: string; role: string };
export type AdminState = { me: AdminMe | null; perms: Perms | null; setupOpen: boolean; noStaff: boolean };

export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || "Something went wrong"), { status: r.status });
  return j as T;
}

/** Load a URL; returns data, error, loading and a reload function. */
export function useAdmin<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try { setData(await api<T>(url)); setError(""); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load };
}

export const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const num = (n: number) => n.toLocaleString("en-US");
export const when = (d: string | Date | null | undefined) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
export const day = (d: string | Date | null | undefined) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export function Head({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="ad-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {right && <div className="ad-head-r">{right}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, money, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; money?: boolean; tone?: "warn" | "danger" }) {
  return (
    <div className="ad-stat">
      <div className="ad-stat-l">{label}</div>
      <div className={`ad-stat-v num ${money ? "money" : ""} ${tone ? "is-" + tone : ""}`}>{value}</div>
      {sub && <div className="ad-stat-s">{sub}</div>}
    </div>
  );
}

const PILL: Record<string, [string, string]> = {
  open: ["Live", "good"], funding: ["Waiting for payment", "warn"], paused: ["Paused", "muted"], closed: ["Ended", "muted"],
  pending: ["Pending", "warn"], paid: ["Approved", "good"], rejected: ["Rejected", "danger"],
  clipper: ["Clipper", "brand"], creator: ["Streamer", "blue"], owner: ["Owner", "brand"], admin: ["Admin", "blue"], manager: ["Manager", "muted"], custom: ["Custom", "muted"],
  suspended: ["Suspended", "danger"], disabled: ["Deactivated", "danger"], invited: ["Invite sent", "warn"],
};
export function Pill({ k, label }: { k: string; label?: string }) {
  const [text, tone] = PILL[k] || [k, "muted"];
  return <span className={`ad-pill is-${tone}`}>{label ?? text}</span>;
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return <div className="ad-empty"><b>{title}</b>{body && <p>{body}</p>}</div>;
}

export function Err({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return <div className="ad-err" role="alert"><span>{msg}</span>{onRetry && <button className="cf-btn cf-btn--sm" onClick={onRetry}>Try again</button>}</div>;
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return <div className="ad-loading">{Array.from({ length: rows }, (_, i) => <div key={i} className="ad-skel" />)}</div>;
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; label: string; n?: number }[] }) {
  return (
    <div className="ad-tabs" role="tablist">
      {options.map(o => (
        <button key={o.v} role="tab" aria-selected={value === o.v} className={value === o.v ? "on" : ""} onClick={() => onChange(o.v)}>
          {o.label}{o.n != null && <span className="num">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

/** A table on desktop that turns into stacked cards on phones (each cell carries its column label). */
export function Table({ cols, rows, empty }: { cols: string[]; rows: React.ReactNode[][]; empty?: React.ReactNode }) {
  if (!rows.length) return <>{empty ?? <Empty title="Nothing here yet" />}</>;
  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} data-l={cols[j]}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Small confirm-with-reason dialog for actions that land in the audit log. */
export function Confirm({ title, body, cta, danger, needReason, needCode, onCancel, onConfirm }: {
  title: string; body: string; cta: string; danger?: boolean; needReason?: boolean; needCode?: boolean;
  onCancel: () => void; onConfirm: (v: { reason: string; code: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState(""), [code, setCode] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  async function go() {
    if (needReason && !reason.trim()) { setErr("Add a reason. It goes in the audit log."); return; }
    setBusy(true); setErr("");
    try { await onConfirm({ reason, code }); } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="ad-modal-wrap" onClick={onCancel}>
      <div className="ad-modal cf-rise" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{body}</p>
        {needReason && <label className="ad-field"><span>Reason</span><input autoFocus value={reason} onChange={e => setReason(e.target.value)} maxLength={300} /></label>}
        {needCode && <label className="ad-field"><span>6-digit code from your authenticator</span><input autoFocus={!needReason} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="num" /></label>}
        {err && <p className="ad-form-err" role="alert">{err}</p>}
        <div className="ad-modal-btns">
          <button className="cf-btn cf-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className={`cf-btn ${danger ? "cf-btn--danger" : "cf-btn--primary"}`} onClick={go} disabled={busy}>{busy ? "Working..." : cta}</button>
        </div>
      </div>
    </div>
  );
}

export const ADMIN_CSS = `
.ad-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px;}
.ad-head h1{font-size:24px;line-height:30px;font-weight:600;letter-spacing:-0.02em;}
.ad-head p{font-size:14px;color:var(--text-2);margin-top:4px;max-width:640px;}
.ad-head-r{display:flex;gap:8px;flex-wrap:wrap;}
.ad-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:24px;}
@media(min-width:900px){.ad-grid{grid-template-columns:repeat(4,minmax(0,1fr));}}
.ad-stat{background:var(--surface-1);border:1px solid var(--line);border-radius:var(--r-md);padding:16px;min-width:0;}
.ad-stat-l{font-size:12px;color:var(--text-3);font-weight:500;}
.ad-stat-v{font-size:26px;line-height:32px;font-weight:500;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ad-stat-v.is-warn{color:var(--warn);}.ad-stat-v.is-danger{color:var(--danger);}
.ad-stat-s{font-size:12px;color:var(--text-3);margin-top:4px;}
.ad-card{background:var(--surface-1);border:1px solid var(--line);border-radius:var(--r-md);padding:20px;margin-bottom:16px;min-width:0;}
.ad-card h2{font-size:15px;font-weight:600;margin-bottom:4px;}
.ad-card .ad-card-sub{font-size:13px;color:var(--text-3);margin-bottom:16px;}
.ad-two{display:grid;gap:16px;}
@media(min-width:1000px){.ad-two{grid-template-columns:minmax(0,1fr) minmax(0,1fr);}}
.ad-pill{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;font-size:11.5px;font-weight:500;white-space:nowrap;}
.ad-pill.is-good{background:var(--money-tint);color:var(--money);}
.ad-pill.is-warn{background:var(--warn-tint);color:var(--warn);}
.ad-pill.is-danger{background:var(--danger-tint);color:var(--danger);}
.ad-pill.is-brand{background:var(--brand-tint);color:var(--brand-400);}
.ad-pill.is-blue{background:rgba(43,159,214,0.14);color:#7CC4EA;}
.ad-pill.is-muted{background:var(--surface-3);color:var(--text-2);}
.ad-empty{padding:40px 20px;text-align:center;border:1px dashed var(--line-strong);border-radius:var(--r-md);}
.ad-empty b{display:block;font-size:15px;font-weight:600;}
.ad-empty p{font-size:13.5px;color:var(--text-2);margin-top:6px;max-width:460px;margin-left:auto;margin-right:auto;}
.ad-err{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:var(--r-sm);background:var(--danger-tint);color:var(--danger);font-size:14px;margin-bottom:16px;}
.ad-loading{display:flex;flex-direction:column;gap:10px;}
.ad-skel{height:52px;border-radius:var(--r-sm);background:var(--surface-1);animation:adp 1.4s ease-in-out infinite;}
@keyframes adp{50%{opacity:.5}}
.ad-tabs{display:flex;gap:4px;overflow-x:auto;margin-bottom:16px;padding-bottom:2px;}
.ad-tabs button{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--text-2);font-size:13px;white-space:nowrap;}
.ad-tabs button.on{background:var(--brand-tint);border-color:transparent;color:var(--text);}
.ad-tabs button span{font-size:11.5px;color:var(--text-3);}
.ad-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;}
.ad-toolbar input[type=search]{max-width:340px;height:38px;}
.ad-table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r-md);background:var(--surface-1);}
.ad-table{width:100%;border-collapse:collapse;font-size:13.5px;}
.ad-table th{text-align:left;font-size:11.5px;font-weight:500;color:var(--text-3);padding:10px 14px;border-bottom:1px solid var(--line);white-space:nowrap;background:var(--surface-1);}
.ad-table td{padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:middle;}
.ad-table tr:last-child td{border-bottom:none;}
.ad-table tbody tr:hover td{background:rgba(255,255,255,0.015);}
.ad-table a.ad-link{color:var(--text);font-weight:500;}
.ad-table a.ad-link:hover{color:var(--brand-400);}
.ad-muted{color:var(--text-3);font-size:12.5px;}
@media(max-width:699px){
.ad-table-wrap{border:none;background:none;overflow:visible;}
.ad-table thead{display:none;}
.ad-table,.ad-table tbody,.ad-table tr,.ad-table td{display:block;width:100%;}
.ad-table tr{background:var(--surface-1);border:1px solid var(--line);border-radius:var(--r-md);padding:8px 14px;margin-bottom:10px;}
.ad-table td{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid var(--line);text-align:right;}
.ad-table td::before{content:attr(data-l);font-size:12px;color:var(--text-3);text-align:left;flex-shrink:0;}
.ad-table tr td:last-child{border-bottom:none;}
}
.ad-modal-wrap{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:16px;}
.ad-modal{width:100%;max-width:440px;background:var(--surface-2);border:1px solid var(--line-strong);border-radius:var(--r-lg);padding:24px;box-shadow:0 24px 64px rgba(0,0,0,0.6);}
.ad-modal h2{font-size:18px;font-weight:600;margin-bottom:6px;}
.ad-modal>p{font-size:14px;color:var(--text-2);margin-bottom:16px;}
.ad-modal-btns{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;}
.ad-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;}
.ad-field>span{font-size:12.5px;color:var(--text-2);font-weight:500;}
.ad-form-err{color:var(--danger);font-size:13px;margin-top:4px;}
.ad-kv{display:grid;grid-template-columns:minmax(120px,auto) 1fr;gap:8px 16px;font-size:14px;}
.ad-kv dt{color:var(--text-3);}
.ad-kv dd{min-width:0;overflow-wrap:anywhere;}
.ad-note{font-size:13px;color:var(--text-2);padding:12px 14px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);}
`;
