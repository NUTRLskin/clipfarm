"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Head, Loading, Err, Table, Pill, Confirm, api, useAdmin, usd, num, day, when } from "@/components/admin/AdminKit";
import { useStaff } from "@/components/admin/AdminShell";

type Detail = {
  profile: {
    id: string; name: string | null; email: string | null; username: string | null; role: string; bio: string | null; tiktokHandle: string | null;
    instagramHandle: string | null; youtubeHandle: string | null; country: string | null; twitchLogin: string | null; tiktokConnected: boolean; twitchConnected: boolean;
    hasPassword: boolean; createdAt: string; lastLoginAt: string | null; suspendedAt: string | null; termsVersion: string | null; termsCurrent: boolean; ageConfirmedAt: string | null;
  };
  clips: { id: string; title: string; url: string; views: number; earned: number; status: string; date: string; estimate?: number }[];
  contracts: { id: string; streamer: string; budget: number; budgetUsed: number; status: string; state: string; rate: number; deliveredViews: number }[];
  acceptances: { version: string; role: string; rate: number; feePct: number; at: string; ip: string | null }[];
};

export default function AdminUser() {
  const { id } = useParams<{ id: string }>();
  const { edit, does } = useStaff();
  const { data, error, loading, reload } = useAdmin<Detail>(`/api/admin/users/${id}`);
  const [act, setAct] = useState<null | "suspend" | "unsuspend" | "signout">(null);
  const p = data?.profile;

  return (
    <>
      <Link href="/admin/users" className="cf-btn cf-btn--ghost cf-btn--sm" style={{ marginBottom: 12, paddingLeft: 6 }}><ArrowLeft size={15} />Users</Link>
      {error && <Err msg={error} onRetry={reload} />}
      {loading && !data ? <Loading rows={5} /> : p && data && (
        <>
          <Head title={p.name || p.username || "No name"} sub={`${p.role === "creator" ? "Streamer" : "Clipper"} since ${day(p.createdAt)}`}
            right={edit("users") ? <>
              <button className="cf-btn cf-btn--sm" onClick={() => setAct("signout")}>Sign out everywhere</button>
              {does("suspendUsers") && (p.suspendedAt
                ? <button className="cf-btn cf-btn--sm" onClick={() => setAct("unsuspend")}>Unsuspend</button>
                : <button className="cf-btn cf-btn--danger cf-btn--sm" onClick={() => setAct("suspend")}>Suspend</button>)}
            </> : undefined} />

          <div className="ad-two">
            <div className="ad-card">
              <h2>Profile</h2>
              <p className="ad-card-sub">{p.suspendedAt ? <Pill k="suspended" /> : <Pill k="paid" label="Active" />}</p>
              <dl className="ad-kv">
                <dt>Email</dt><dd>{p.email || "—"}</dd>
                <dt>Username</dt><dd>{p.username ? `@${p.username}` : "—"}</dd>
                {p.role === "creator"
                  ? <><dt>Twitch</dt><dd>{p.twitchLogin ? <a href={`https://twitch.tv/${p.twitchLogin}`} target="_blank" rel="noreferrer">twitch.tv/{p.twitchLogin}</a> : "Not connected"}</dd></>
                  : <><dt>TikTok</dt><dd>{p.tiktokHandle ? `@${p.tiktokHandle}` : "—"} {p.tiktokConnected ? <Pill k="paid" label="Signed in with TikTok" /> : <Pill k="muted" label="Not verified" />}</dd></>}
                {p.instagramHandle && <><dt>Instagram</dt><dd>@{p.instagramHandle}</dd></>}
                {p.youtubeHandle && <><dt>YouTube</dt><dd>@{p.youtubeHandle}</dd></>}
                <dt>Country</dt><dd>{p.country || "—"}</dd>
                <dt>Sign-in</dt><dd>{[p.hasPassword && "Password", p.twitchConnected && "Twitch", p.tiktokConnected && "TikTok"].filter(Boolean).join(", ") || "—"}</dd>
                <dt>Last seen</dt><dd>{when(p.lastLoginAt)}</dd>
                <dt>18+ confirmed</dt><dd>{p.ageConfirmedAt ? day(p.ageConfirmedAt) : "Not yet"}</dd>
              </dl>
            </div>
            <div className="ad-card">
              <h2>Terms accepted</h2>
              <p className="ad-card-sub">{p.termsCurrent ? "On the current version." : "Hasn't accepted the current version yet."}</p>
              <Table cols={["Version", "Rate shown", "When", "IP"]} empty={<p className="ad-muted">No acceptances recorded.</p>}
                rows={data.acceptances.map(a => [a.version, <span className="num">{usd(a.rate)} / 1K · {a.feePct}% fee</span>, when(a.at), <span className="num ad-muted">{a.ip || "—"}</span>])} />
            </div>
          </div>

          {p.role === "creator" ? (
            <div className="ad-card">
              <h2>Contracts</h2>
              <p className="ad-card-sub">{num(data.contracts.length)} total</p>
              <Table cols={["Contract", "Status", "Rate", "Spent", "Views"]} empty={<p className="ad-muted">No contracts yet.</p>}
                rows={data.contracts.map(c => [<span className="num ad-muted">{c.id.slice(0, 8)}</span>, <Pill k={c.state} />,
                  <span className="num">{usd(c.rate)}</span>, <span className="num">{usd(c.budgetUsed)} <span className="ad-muted">of {usd(c.budget)}</span></span>, <span className="num">{num(c.deliveredViews)}</span>])} />
            </div>
          ) : (
            <div className="ad-card">
              <h2>Clips</h2>
              <p className="ad-card-sub">{num(data.clips.length)} submitted · <span className="money num">{usd(data.clips.filter(c => c.status === "paid").reduce((a, c) => a + c.earned, 0))}</span> approved</p>
              <Table cols={["Clip", "Status", "Views", "Earned", "Sent"]} empty={<p className="ad-muted">No clips yet.</p>}
                rows={data.clips.map(c => [<a className="ad-link" href={c.url} target="_blank" rel="noreferrer">{c.title}</a>, <Pill k={c.status} />,
                  <span className="num">{num(c.views)}</span>, <span className="num money">{usd(c.status === "paid" ? c.earned : c.estimate ?? 0)}</span>, <span className="ad-muted">{c.date}</span>])} />
            </div>
          )}
        </>
      )}
      {act && p && (
        <Confirm
          title={act === "suspend" ? `Suspend ${p.name || "this user"}?` : act === "unsuspend" ? "Unsuspend this user?" : "Sign them out everywhere?"}
          body={act === "suspend" ? "They're signed out within a minute and can't submit clips or post contracts until you unsuspend them." : act === "unsuspend" ? "They can sign in and use Clip Farm again." : "Every device they're signed in on is signed out within a minute."}
          cta={act === "suspend" ? "Suspend" : act === "unsuspend" ? "Unsuspend" : "Sign out"} danger={act === "suspend"} needReason={act === "suspend"}
          onCancel={() => setAct(null)}
          onConfirm={async ({ reason }) => { await api(`/api/admin/users/${p.id}`, { method: "PATCH", json: { action: act, reason } }); setAct(null); reload(); }} />
      )}
    </>
  );
}
