"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Head, Loading, Err, Table, Pill, Tabs, Empty, useAdmin, usd, num, day } from "@/components/admin/AdminKit";

type Row = {
  id: string; name: string | null; email: string | null; username: string | null; role: string; tiktokHandle: string | null; twitchLogin: string | null;
  tiktokConnected: boolean; twitchConnected: boolean; termsCurrent: boolean; suspendedAt: string | null; createdAt: string; clips: number; earned: number; contracts: number;
};
type Filter = "all" | "clipper" | "creator" | "suspended";

export default function AdminUsers() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState(""), [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const url = `/api/admin/users?${new URLSearchParams({ ...(filter !== "all" ? { role: filter } : {}), ...(debounced ? { q: debounced } : {}) })}`;
  const { data, error, loading, reload } = useAdmin<Row[]>(url);

  return (
    <>
      <Head title="Users" sub="Every clipper and streamer. Search by name, email, username, TikTok or Twitch." />
      <Tabs value={filter} onChange={setFilter} options={[{ v: "all", label: "Everyone" }, { v: "clipper", label: "Clippers" }, { v: "creator", label: "Streamers" }, { v: "suspended", label: "Suspended" }]} />
      <div className="ad-toolbar"><input type="search" placeholder="Search people" value={q} onChange={e => setQ(e.target.value)} aria-label="Search people" /></div>
      {error && <Err msg={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : data && (
        <Table cols={["Name", "Type", "Account", "Activity", "Joined", "Status"]}
          empty={<Empty title={debounced ? "Nobody matches that search" : "No users yet"} body={debounced ? "Try part of a name, an email or a handle." : "People show up here as soon as they sign up."} />}
          rows={data.map(u => [
            <div><Link className="ad-link" href={`/admin/users/${u.id}`}>{u.name || u.username || "No name"}</Link><div className="ad-muted">{u.email || "No email"}</div></div>,
            <Pill k={u.role} />,
            <span className="ad-muted">{u.role === "creator" ? (u.twitchLogin ? `twitch/${u.twitchLogin}` : "No Twitch") : u.tiktokHandle ? `@${u.tiktokHandle}${u.tiktokConnected ? " ✓" : ""}` : "No TikTok"}</span>,
            u.role === "creator" ? <span className="num">{num(u.contracts)} contracts</span> : <span className="num">{num(u.clips)} clips · <span className="money">{usd(u.earned)}</span></span>,
            <span className="ad-muted">{day(u.createdAt)}</span>,
            u.suspendedAt ? <Pill k="suspended" /> : !u.termsCurrent ? <Pill k="invited" label="Terms not accepted" /> : <Pill k="paid" label="Active" />,
          ])} />
      )}
    </>
  );
}
