"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Head, Stat, Loading, Err, Table, Pill, useAdmin, usd, num } from "@/components/admin/AdminKit";
import { useStaff } from "@/components/admin/AdminShell";

type Overview = {
  rate: number;
  users: { clippers: number; streamers: number; suspended: number; today: number; week: number; needTerms: number };
  signups: { day: string; clippers: number; streamers: number }[];
  contracts: { live: number; waitingForFunding: number; paused: number; ended: number; held: number; awaitingPayment: number };
  money: { clipperEarnings: number; fees: number; paidViews: number };
  clips: { pending: number; approved: number; rejected: number };
  topClippers: { id: string; name: string; earned: number; clips: number }[];
  topContracts: { id: string; streamer: string; budget: number; spent: number; views: number; status: string }[];
  notBuiltYet: string[];
};

export default function AdminHome() {
  const { me, can } = useStaff();
  const { data, error, loading, reload } = useAdmin<Overview>("/api/admin/overview");
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <Head title={`${hello}, ${me.name.split(" ")[0]}`} sub={data ? `Every contract pays ${usd(data.rate)} per 1,000 verified views.` : "Here's Clip Farm right now."}
        right={<button className="cf-btn cf-btn--sm" onClick={reload}>Refresh</button>} />
      {error && <Err msg={error} onRetry={reload} />}
      {loading && !data ? <Loading rows={6} /> : data && (
        <>
          <div className="ad-grid">
            <Stat label="Signups today" value={num(data.users.today)} sub={`${num(data.users.week)} this week`} />
            <Stat label="Clippers" value={num(data.users.clippers)} sub={`${num(data.users.streamers)} streamers`} />
            <Stat label="Live contracts" value={num(data.contracts.live)} sub={data.contracts.waitingForFunding ? `${data.contracts.waitingForFunding} waiting for payment` : "None waiting for payment"} />
            <Stat label="Clips to review" value={num(data.clips.pending)} tone={data.clips.pending > 0 ? "warn" : undefined} sub={`${num(data.clips.approved)} approved`} />
            <Stat label="Money held" value={usd(data.contracts.held)} money sub="Prepaid, not spent yet" />
            <Stat label="Clipper earnings" value={usd(data.money.clipperEarnings)} money sub="Approved so far" />
            <Stat label="Clip Farm fees" value={usd(data.money.fees)} money sub="Earned so far" />
            <Stat label="Paid views" value={num(data.money.paidViews)} sub="On approved clips" />
          </div>

          <div className="ad-card">
            <h2>Signups, last 30 days</h2>
            <p className="ad-card-sub">{num(data.signups.reduce((a, d) => a + d.clippers + d.streamers, 0))} new accounts</p>
            <SignupChart days={data.signups} />
          </div>

          <div className="ad-two">
            <div className="ad-card">
              <h2>Top clippers</h2>
              <p className="ad-card-sub">By approved earnings</p>
              <Table cols={["Clipper", "Clips", "Earned"]} empty={<p className="ad-muted">No approved clips yet.</p>}
                rows={data.topClippers.map(c => [
                  can("users") ? <Link className="ad-link" href={`/admin/users/${c.id}`}>{c.name}</Link> : c.name,
                  <span className="num">{num(c.clips)}</span>, <span className="num money">{usd(c.earned)}</span>,
                ])} />
            </div>
            <div className="ad-card">
              <h2>Top contracts</h2>
              <p className="ad-card-sub">By money spent</p>
              <Table cols={["Streamer", "Status", "Spent"]} empty={<p className="ad-muted">No contracts yet.</p>}
                rows={data.topContracts.map(c => [c.streamer, <Pill k={c.status} />, <span className="num">{usd(c.spent)} <span className="ad-muted">of {usd(c.budget)}</span></span>])} />
            </div>
          </div>

          {(data.users.needTerms > 0 || data.users.suspended > 0) && (
            <div className="ad-note" style={{ marginBottom: 16 }}>
              {data.users.needTerms > 0 && <>{num(data.users.needTerms)} {data.users.needTerms === 1 ? "person hasn't" : "people haven't"} accepted the current terms yet. They&apos;re asked the next time they open the app. </>}
              {data.users.suspended > 0 && <>{num(data.users.suspended)} suspended.</>}
            </div>
          )}
          <p className="ad-muted">Coming with later phases: {data.notBuiltYet.join(" · ")}.</p>
        </>
      )}
    </>
  );
}

/** Stacked daily bars. Clippers (brand purple) and streamers (blue), validated for colorblind separation on this surface. */
function SignupChart({ days }: { days: Overview["signups"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  // Draw at the real pixel width so labels stay 11px on a phone instead of shrinking with the SVG.
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, [table]);
  const max = Math.max(1, ...days.map(d => d.clippers + d.streamers));
  const nice = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const H = W < 500 ? 160 : 190, padL = 28, padB = 22, plotW = W - padL, plotH = H - padB;
  const bw = plotW / days.length, barW = Math.max(3, bw - (bw > 10 ? 4 : 2));
  const every = W < 500 ? 10 : 7;
  const y = (v: number) => plotH - (v / nice) * plotH;
  const fmtDay = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const h = hover != null ? days[hover] : null;

  return (
    <div>
      <div className="sc-top">
        <div className="sc-legend">
          <span><i style={{ background: "#8B5CF6" }} />Clippers</span>
          <span><i style={{ background: "#2B9FD6" }} />Streamers</span>
        </div>
        <button className="cf-btn cf-btn--ghost cf-btn--sm" onClick={() => setTable(t => !t)}>{table ? "Show chart" : "Show as table"}</button>
      </div>
      {table ? (
        <Table cols={["Day", "Clippers", "Streamers"]} rows={[...days].reverse().map(d => [fmtDay(d.day), <span className="num">{d.clippers}</span>, <span className="num">{d.streamers}</span>])} />
      ) : (
        <div className="sc-wrap" ref={wrap} onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="sc" role="img" aria-label="Daily signups for the last 30 days, clippers and streamers stacked">
            {[0, 0.5, 1].map(f => (
              <g key={f}>
                <line x1={padL} x2={W} y1={y(nice * f)} y2={y(nice * f)} stroke="rgba(255,255,255,0.06)" />
                <text x={padL - 8} y={y(nice * f) + 4} textAnchor="end" className="sc-ax">{Math.round(nice * f)}</text>
              </g>
            ))}
            {days.map((d, i) => {
              const x = padL + i * bw + (bw - barW) / 2;
              const yc = y(d.clippers), ys = y(d.clippers + d.streamers);
              const r = Math.min(4, barW / 2);
              return (
                <g key={d.day} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${fmtDay(d.day)}: ${d.clippers} clippers, ${d.streamers} streamers`}>
                  <rect x={padL + i * bw} y={0} width={bw} height={plotH} fill={hover === i ? "rgba(255,255,255,0.03)" : "transparent"} />
                  {d.clippers > 0 && <path d={bar(x, yc, barW, plotH - yc, d.streamers > 0 ? 0 : r)} fill="#8B5CF6" />}
                  {d.streamers > 0 && <path d={bar(x, ys, barW, Math.max(0, yc - ys - (d.clippers > 0 ? 2 : 0)), r)} fill="#2B9FD6" />}
                  {((i % every === 0 && i < days.length - every / 2) || i === days.length - 1) && <text x={i === days.length - 1 ? x + barW : x + barW / 2} y={H - 6} textAnchor={i === days.length - 1 ? "end" : "middle"} className="sc-ax">{fmtDay(d.day)}</text>}
                </g>
              );
            })}
            <line x1={padL} x2={W} y1={plotH} y2={plotH} stroke="rgba(255,255,255,0.14)" />
          </svg>
          {h && hover != null && (
            <div className="sc-tip" style={{ left: `${Math.min(88, Math.max(12, ((padL + hover * bw + bw / 2) / W) * 100))}%` }}>
              <b>{fmtDay(h.day)}</b>
              <span><i style={{ background: "#8B5CF6" }} />Clippers <em className="num">{h.clippers}</em></span>
              <span><i style={{ background: "#2B9FD6" }} />Streamers <em className="num">{h.streamers}</em></span>
            </div>
          )}
        </div>
      )}
      <style>{`
.sc-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;}
.sc-legend{display:flex;gap:16px;font-size:12.5px;color:var(--text-2);}
.sc-legend span,.sc-tip span{display:inline-flex;align-items:center;gap:6px;}
.sc-legend i,.sc-tip i{width:10px;height:10px;border-radius:3px;display:inline-block;}
.sc-wrap{position:relative;}
.sc{width:100%;height:auto;display:block;overflow:visible;}
.sc g{outline:none;}
.sc-ax{font-size:11px;fill:var(--text-3);font-family:var(--font-mono),monospace;}
.sc-tip{position:absolute;top:-6px;transform:translate(-50%,-100%);background:var(--surface-3);border:1px solid var(--line-strong);border-radius:8px;padding:8px 10px;font-size:12px;display:flex;flex-direction:column;gap:3px;pointer-events:none;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.4);z-index:2;}
.sc-tip b{font-weight:600;font-size:12px;}
.sc-tip em{font-style:normal;margin-left:auto;padding-left:12px;color:var(--text);}
      `}</style>
    </div>
  );
}

/** A bar with only its top corners rounded (data end), flat on the baseline. */
function bar(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const rr = Math.min(r, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
