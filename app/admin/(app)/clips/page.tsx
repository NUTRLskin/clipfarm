"use client";
import { useState } from "react";
import Link from "next/link";
import { Head, Loading, Err, Table, Pill, Tabs, Empty, useAdmin, usd, num, day } from "@/components/admin/AdminKit";
import { useStaff } from "@/components/admin/AdminShell";

type Row = { id: string; title: string; url: string; clipper: string | null; clipperId: string; streamer: string; status: string; views: number; earned: number; fee: number; rate: number; viewsSyncedAt: string | null; createdAt: string };
type Filter = "all" | "pending" | "paid" | "rejected";

export default function AdminClips() {
  const { can } = useStaff();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, error, loading, reload } = useAdmin<Row[]>(`/api/admin/clips${filter !== "all" ? `?status=${filter}` : ""}`);

  return (
    <>
      <Head title="Clips & views" sub="Every clip sent to a contract. View history charts and fraud scores arrive with view snapshots." />
      <Tabs value={filter} onChange={setFilter} options={[{ v: "all", label: "All" }, { v: "pending", label: "Pending" }, { v: "paid", label: "Approved" }, { v: "rejected", label: "Rejected" }]} />
      {error && <Err msg={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : data && (
        <Table cols={["Clip", "Clipper", "Streamer", "Status", "Views", "Earned", "Sent"]}
          empty={<Empty title="No clips here" body="Clips show up as soon as a clipper sends one to a contract." />}
          rows={data.map(c => [
            <a className="ad-link" href={c.url} target="_blank" rel="noreferrer">{c.title}</a>,
            can("users") ? <Link className="ad-link" href={`/admin/users/${c.clipperId}`}>{c.clipper || "Clipper"}</Link> : c.clipper,
            c.streamer,
            <Pill k={c.status} />,
            <span className="num">{num(c.views)}</span>,
            c.status === "paid" ? <span className="num money">{usd(c.earned)}</span> : <span className="ad-muted num">{usd((c.views / 1000) * c.rate)} est.</span>,
            <span className="ad-muted">{day(c.createdAt)}</span>,
          ])} />
      )}
    </>
  );
}
