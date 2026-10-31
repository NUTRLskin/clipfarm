"use client";
import { Fragment, useState } from "react";
import { Head, Loading, Err, Confirm, api, useAdmin, usd, num, when } from "@/components/admin/AdminKit";
import { useStaff } from "@/components/admin/AdminShell";

type Settings = {
  rate: number; rateUpdatedAt: string | null; rateUpdatedBy: string | null; feePct: number; holdDays: number; payoutDay: string; minPayout: number; viewWindowDays: number; minBudget: number;
  terms: { version: string; accepted: number; needToAccept: number; acceptancesByVersion: { version: string; n: number }[] };
};

export default function AdminSettings() {
  const { me } = useStaff();
  const { data, error, loading, reload } = useAdmin<Settings>("/api/admin/settings");
  const [rate, setRate] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState("");
  const owner = me.role === "owner";
  const parsed = Number(rate);
  const valid = rate !== "" && Number.isFinite(parsed) && parsed >= 0.1 && parsed <= 20 && data && Math.round(parsed * 100) !== Math.round(data.rate * 100);

  return (
    <>
      <Head title="Settings" sub="App-wide rules. Changes apply to contracts that go live from now on, never to live ones." />
      {error && <Err msg={error} onRetry={reload} />}
      {loading && !data ? <Loading rows={4} /> : data && (
        <>
          <div className="ad-card">
            <h2>Rate</h2>
            <p className="ad-card-sub">What every contract pays clippers per 1,000 verified views. Streamers pay this plus the {data.feePct}% fee.</p>
            <div className="st-rate">
              <div><div className="num money st-big">{usd(data.rate)}</div><div className="ad-muted">per 1,000 views · streamers pay <span className="num">{usd(data.rate * (1 + data.feePct / 100))}</span></div></div>
              {owner ? (
                <form className="st-form" onSubmit={e => { e.preventDefault(); if (valid) setConfirm(true); }}>
                  <label className="ad-field" style={{ margin: 0 }}><span>New rate (dollars)</span>
                    <input inputMode="decimal" className="num" placeholder={data.rate.toFixed(2)} value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
                  <button className="cf-btn cf-btn--primary" disabled={!valid}>Change rate</button>
                </form>
              ) : <p className="ad-muted">Only an Owner can change the rate.</p>}
            </div>
            {msg && <p className="ad-note" style={{ marginTop: 12 }}>{msg}</p>}
            <p className="ad-muted" style={{ marginTop: 12 }}>{data.rateUpdatedAt ? `Last changed ${when(data.rateUpdatedAt)}${data.rateUpdatedBy ? ` by ${data.rateUpdatedBy}` : ""}.` : "Set at launch."}</p>
          </div>

          <div className="ad-two">
            <div className="ad-card">
              <h2>Terms</h2>
              <p className="ad-card-sub">One set of rules for everyone, accepted at sign-up.</p>
              <dl className="ad-kv">
                <dt>Current version</dt><dd className="num">{data.terms.version}</dd>
                <dt>Accepted</dt><dd className="num">{num(data.terms.accepted)} people</dd>
                <dt>Still to accept</dt><dd className="num">{num(data.terms.needToAccept)} people</dd>
                {data.terms.acceptancesByVersion.map(v => <Fragment key={v.version}><dt>Version {v.version}</dt><dd className="num">{num(v.n)} acceptances</dd></Fragment>)}
              </dl>
              <p className="ad-muted" style={{ marginTop: 12 }}>Publishing a new version is a code change (lib/terms.ts). Everyone is asked to accept it on their next visit.</p>
            </div>
            <div className="ad-card">
              <h2>Payout rules</h2>
              <p className="ad-card-sub">Set in code for now. These become editable with Stripe.</p>
              <dl className="ad-kv">
                <dt>Clip Farm fee</dt><dd className="num">{data.feePct}% on top</dd>
                <dt>Views count for</dt><dd className="num">{data.viewWindowDays} days</dd>
                <dt>Hold before payout</dt><dd className="num">{data.holdDays} days</dd>
                <dt>Payout day</dt><dd>{data.payoutDay}s</dd>
                <dt>Minimum payout</dt><dd className="num">{usd(data.minPayout)}</dd>
                <dt>Minimum budget</dt><dd className="num">{usd(data.minBudget)}</dd>
              </dl>
            </div>
          </div>
        </>
      )}
      {confirm && data && (
        <Confirm title={`Change the rate to ${usd(parsed)}?`} needCode cta="Change rate"
          body={`New contracts will pay clippers ${usd(parsed)} per 1,000 views. Live contracts keep ${usd(data.rate)}. Your public pages and terms still say ${usd(data.rate)} until they're updated, so tell Claude to update them too.`}
          onCancel={() => setConfirm(false)}
          onConfirm={async ({ code }) => { await api("/api/admin/settings", { method: "PUT", json: { rate: parsed, code } }); setConfirm(false); setRate(""); setMsg(`Rate changed to ${usd(parsed)}.`); reload(); }} />
      )}
      <style>{`.st-rate{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;}.st-big{font-size:36px;line-height:42px;font-weight:500;}.st-form{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;}.st-form input{width:140px;height:40px;}`}</style>
    </>
  );
}
