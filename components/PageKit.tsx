"use client";
/** Shared building blocks for the logged-in pages: page width, list states, filters, sheets. */
import React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Badge, Skeleton } from "@/components/ui";
import "@/components/studio/studio.css";

/** Lucide defaults for the app: 16px, 1.75 stroke. Spread into any icon. */
export const ic = { size: 16, strokeWidth: 1.75 } as const;

/** fetch + JSON that throws a readable error on a non-2xx response. */
export async function getJSON<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j && (j as any).error) || `Request failed (${r.status})`);
  return j as T;
}

/** Centered content column. ~960px, or ~1200px when `wide`. */
export function Page({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`cf-page cf-rise${wide ? " wide" : ""}`}>{children}</div>;
}

const CLIP_STATUS: Record<string, { type: string; label: string }> = {
  pending: { type: "amber", label: "Pending" },
  paid: { type: "green", label: "Approved" },
  rejected: { type: "red", label: "Rejected" },
};
/** Clip / payout status: color plus text, never color alone. */
export function StatusBadge({ status }: { status: string }) {
  const s = CLIP_STATUS[status] || { type: "default", label: status };
  return <Badge type={s.type}>{s.label}</Badge>;
}

const CONTRACT_STATUS: Record<string, { type: string; label: string }> = {
  open: { type: "purple", label: "Open" },
  upcoming: { type: "amber", label: "Starting soon" },
  closed: { type: "default", label: "Closed" },
  funding: { type: "amber", label: "Waiting for funding" },
};
export function ContractBadge({ status }: { status: string }) {
  const s = CONTRACT_STATUS[status] || { type: "default", label: status };
  return <Badge type={s.type}>{s.label}</Badge>;
}

/** What went wrong + a retry button. */
export function ErrorState({ title = "Couldn't load this", message, onRetry, children }: { title?: string; message?: string | null; onRetry?: () => void; children?: React.ReactNode }) {
  return (
    <div className="cf-card cf-error" role="alert">
      <AlertCircle {...ic} size={18} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        {message && <div className="cf-sub" style={{ marginTop: 2, wordBreak: "break-word" }}>{message}</div>}
        {children}
      </div>
      {onRetry && <button type="button" className="cf-btn cf-btn--sm" onClick={onRetry}><RefreshCw {...ic} size={14} />Retry</button>}
    </div>
  );
}

/** Placeholder rows while a list loads. */
export function ListSkeleton({ rows = 3, height = 64, card = false }: { rows?: number; height?: number; card?: boolean }) {
  return (
    <div className={card ? "cf-grid-cards" : "cf-list"} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="cf-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, minHeight: height }}>
          <Skeleton h={14} w="55%" />
          <Skeleton h={12} w="35%" />
          {card && <><div style={{ flex: 1 }} /><Skeleton h={4} /><Skeleton h={32} r={8} /></>}
        </div>
      ))}
    </div>
  );
}

/** Pill filter row. Scrolls sideways inside itself on small screens. */
export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="cf-chips" role="group" aria-label="Filter">
      {options.map(o => (
        <button key={o.value} type="button" className="cf-chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Link styled as a button. */
export function LinkBtn({ href, children, primary, ghost, small, full, external }: { href: string; children: React.ReactNode; primary?: boolean; ghost?: boolean; small?: boolean; full?: boolean; external?: boolean }) {
  const cls = ["cf-btn", primary && "cf-btn--primary", ghost && "cf-btn--ghost", small && "cf-btn--sm", full && "cf-btn--full"].filter(Boolean).join(" ");
  if (external) return <a className={cls} href={href} target="_blank" rel="noreferrer">{children}</a>;
  return <Link className={cls} href={href}>{children}</Link>;
}

export function Toast({ children }: { children: React.ReactNode }) {
  return <div className="cf-toast cf-rise" role="status">{children}</div>;
}

/** Modal: centered on desktop, bottom sheet on phones. */
export function Sheet({ title, sub, onClose, children }: { title: string; sub?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="cf-sheet-bg" onClick={onClose}>
      <div className="cf-sheet cf-rise" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div className="cf-h2" style={{ fontSize: 18 }}>{title}</div>
            {sub && <div className="cf-sub" style={{ marginTop: 2 }}>{sub}</div>}
          </div>
          <button type="button" className="cf-btn cf-btn--ghost cf-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: "0 8px" }}><X {...ic} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
