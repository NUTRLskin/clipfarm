"use client";
import { useState } from "react";
import { Head, Loading, Err, Table, Pill, Tabs, Empty, Confirm, api, useAdmin, usd, num, day } from "@/components/admin/AdminKit";
import { useStaff } from "@/components/admin/AdminShell";

type Row = { id: string; streamer: string; twitchLogin: string; status: string; budget: number; spent: number; left: number; rate: number; targetViews: number; deliveredViews: number; clipsAccepted: number; createdAt: string };
type Filter = "all" | "funding" | "open" | "paused" | "closed";
type Act = { row: Row; action: "fund" | "pause" | "resume" | "end" };

const COPY: Record<Act["action"], { title: string; body: (r: Row) => string; cta: string; danger?: boolean }> = {
  fund: { title: "Mark as paid and open it?", body: r => `Only do this once ${usd(r.budget)} from ${r.streamer} has actually arrived. The contract opens to clippers and locks today's rate.`, cta: "Money received, open it" },
  pause: { title: "Pause this contract?", body: () => "Clippers can't submit new clips until you resume it. Clips already sent can still be reviewed.", cta: "Pause" },
  resume: { title: "Resume this contract?", body: () => "Clippers can submit clips again.", cta: "Resume" },
  end: { title: "End this contract early?", body: r => `It closes for good. ${usd(r.left)} of unspent budget becomes refundable to ${r.streamer}.`, cta: "End contract", danger: true },
};

export default function AdminContracts() {
  const { edit, does } = useStaff();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, error, loading, reload } = useAdmin<Row[]>(`/api/admin/contracts${filter !== "all" ? `?status=${filter}` : ""}`);
  const [act, setAct] = useState<Act | null>(null);
  const can = edit("contracts");

  return (
    <>
      <Head title="Contracts" sub="Every streamer contract. The rate locks when a contract goes live and never changes after that." />
      <Tabs value={filter} onChange={setFilter} options={[{ v: "all", label: "All" }, { v: "funding", label: "Waiting for payment" }, { v: "open", label: "Live" }, { v: "paused", label: "Paused" }, { v: "closed", label: "Ended" }]} />
      {error && <Err msg={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : data && (
        <Table cols={["Streamer", "Status", "Rate", "Spent", "Views", "Created", ""]}
          empty={<Empty title="No contracts here" body="When a streamer posts a contract it waits here for payment, then goes live." />}
          rows={data.map(c => [
            <div><b style={{ fontWeight: 500 }}>{c.streamer}</b><div className="ad-muted">twitch/{c.twitchLogin}</div></div>,
            <Pill k={c.status} />,
            <span className="num">{usd(c.rate)}</span>,
            <span className="num">{usd(c.spent)} <span className="ad-muted">of {usd(c.budget)}</span></span>,
            <span className="num">{num(c.deliveredViews)}<span className="ad-muted"> / {num(c.targetViews)}</span></span>,
            <span className="ad-muted">{day(c.createdAt)}</span>,
            can ? <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
              {c.status === "funding" && does("fundContracts") && <button className="cf-btn cf-btn--primary cf-btn--sm" onClick={() => setAct({ row: c, action: "fund" })}>Mark paid</button>}
              {c.status === "open" && <button className="cf-btn cf-btn--sm" onClick={() => setAct({ row: c, action: "pause" })}>Pause</button>}
              {c.status === "paused" && <button className="cf-btn cf-btn--sm" onClick={() => setAct({ row: c, action: "resume" })}>Resume</button>}
              {c.status !== "closed" && does("cancelContracts") && <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => setAct({ row: c, action: "end" })}>End</button>}
            </div> : null,
          ])} />
      )}
      {act && (
        <Confirm title={COPY[act.action].title} body={COPY[act.action].body(act.row)} cta={COPY[act.action].cta} danger={COPY[act.action].danger} needReason={act.action === "end"}
          onCancel={() => setAct(null)}
          onConfirm={async ({ reason }) => { await api("/api/admin/contracts", { method: "PATCH", json: { id: act.row.id, action: act.action, note: reason } }); setAct(null); reload(); }} />
      )}
    </>
  );
}
