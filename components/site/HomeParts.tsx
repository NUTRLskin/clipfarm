"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Sprout } from "lucide-react";
import { SITE } from "@/lib/site";

/** The one app-wide rate clippers earn per 1,000 verified views, in dollars. */
const RATE = SITE.rateCents / 100;

/* Deterministic pseudo-random so the waveform renders identically on server and client. */
function seeded(n: number) { let s = 7; return Array.from({ length: n }, () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }); }

const CLIPS = [
  { score: 94, cap: "HE DID NOT JUST", t: "0:41" },
  { score: 91, cap: "chat was right", t: "0:28" },
  { score: 88, cap: "WAIT FOR IT", t: "0:52" },
  { score: 86, cap: "no way bro", t: "0:33" },
  { score: 83, cap: "1v4 CLUTCH", t: "0:47" },
  { score: 81, cap: "storytime", t: "1:02" },
];

/** Hero visual: the real Farm screen, simplified. A VOD timeline scans, peaks light up, clips drop in. */
export function FarmDemo() {
  const bars = useMemo(() => seeded(96).map((v, i) => {
    const peak = [11, 23, 38, 52, 67, 83].includes(i);
    return { h: peak ? 0.92 : 0.18 + v * 0.45, peak };
  }), []);
  return (
    <div className="fd" aria-label="Clip Farm turning a 3 hour VOD into clips" role="img">
      <div className="fd-bar">
        <span className="fd-dot" /><span className="fd-dot" /><span className="fd-dot" />
        <span className="fd-url">clipfarm.app/farm</span>
      </div>
      <div className="fd-body">
        <div className="fd-head">
          <div>
            <div className="fd-k">VOD</div>
            <div className="fd-title">Road to 100K — ranked grind</div>
          </div>
          <div className="fd-len num">3:12:44</div>
        </div>
        <div className="fd-wave">
          {bars.map((b, i) => <span key={i} className={b.peak ? "pk" : ""} style={{ height: `${b.h * 100}%`, animationDelay: `${(i / 96) * 2.4}s` }} />)}
          <span className="fd-head-line" />
        </div>
        <div className="fd-stage"><Sprout size={14} /> Found 20 moments · cutting clips</div>
        <div className="fd-grid">
          {CLIPS.map((c, i) => (
            <div key={i} className="fd-clip" style={{ animationDelay: `${0.6 + i * 0.28}s` }}>
              <div className="fd-cam" />
              <div className="fd-game"><span className="fd-cap">{c.cap}</span></div>
              <div className="fd-meta"><span className="fd-score num">{c.score}</span><span className="num">{c.t}</span></div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .fd{border:1px solid var(--line-strong);border-radius:16px;background:var(--surface-1);overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.55);}
        .fd-bar{display:flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-bottom:1px solid var(--line);background:var(--surface-2);}
        .fd-dot{width:9px;height:9px;border-radius:50%;background:var(--surface-4);}
        .fd-url{margin-left:12px;font-size:11px;color:var(--text-3);font-family:var(--font-mono);}
        .fd-body{padding:16px;}
        .fd-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;}
        .fd-k{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.1em;}
        .fd-title{font-size:14px;font-weight:600;margin-top:2px;}
        .fd-len{font-size:12px;color:var(--text-2);}
        .fd-wave{position:relative;display:flex;align-items:flex-end;gap:2px;height:56px;padding:6px 8px;border-radius:10px;background:var(--surface-2);overflow:hidden;}
        .fd-wave span{flex:1;border-radius:1px;background:var(--surface-4);animation:fd-lit 4.8s var(--ease) infinite;}
        .fd-wave span.pk{animation-name:fd-pk;}
        .fd-head-line{position:absolute!important;top:0;bottom:0;width:2px!important;flex:none!important;background:var(--brand)!important;animation:fd-scan 4.8s linear infinite!important;border-radius:0!important;height:auto!important;}
        @keyframes fd-scan{from{left:0}to{left:100%}}
        @keyframes fd-lit{0%,100%{background:var(--surface-4)}}
        @keyframes fd-pk{0%,8%{background:var(--surface-4)}12%,100%{background:var(--brand-400)}}
        .fd-stage{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--brand-400);margin:12px 0;}
        .fd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
        .fd-clip{aspect-ratio:9/16;border-radius:10px;overflow:hidden;background:var(--surface-3);display:flex;flex-direction:column;position:relative;animation:fd-drop .5s var(--ease) both;}
        .fd-cam{flex:0 0 38%;background:#1E1B2E;border-bottom:1px solid rgba(0,0,0,0.4);}
        .fd-game{flex:1;background:#15151B;display:flex;align-items:flex-start;justify-content:center;padding-top:10%;}
        .fd-cap{font-size:clamp(8px,1.1vw,11px);font-weight:800;color:#fff;text-shadow:0 1px 0 #000,0 0 4px #000;text-align:center;padding:0 4px;letter-spacing:-0.01em;}
        .fd-meta{position:absolute;left:6px;right:6px;bottom:6px;display:flex;justify-content:space-between;font-size:10px;color:var(--text-2);}
        .fd-score{background:var(--brand);color:#fff;border-radius:4px;padding:0 4px;}
        @keyframes fd-drop{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
        @media(min-width:560px){.fd-grid{grid-template-columns:repeat(6,1fr);}}
      `}</style>
    </div>
  );
}

const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : `${Math.round(n / 1000)}K`;

/** "Do the math" calculator. The disclaimer is always visible, never in a tooltip (PRD 13.2, 15). */
export function EarningsCalculator() {
  const [views, setViews] = useState(500_000);
  const earned = (views / 1000) * RATE;
  return (
    <div className="ec cf-card">
      <div className="ec-row">
        <label htmlFor="ec-v">Views your clips get</label>
        <output className="num">{fmt(views)}</output>
      </div>
      <input id="ec-v" type="range" min={10_000} max={5_000_000} step={10_000} value={views} onChange={e => setViews(+e.target.value)} />
      <p className="ec-rate">Every contract pays <b className="num">${RATE.toFixed(2)}</b> per 1,000 verified views.</p>
      <div className="ec-out">
        <span>You&apos;d earn</span>
        <b className="num">${earned.toLocaleString("en-US", { maximumFractionDigits: 0 })}</b>
      </div>
      <p className="ec-fine">Example only. What you earn depends on your clips, the contracts you join and how many verified views you get. Most people earn less than the examples. See our <Link href="/legal/earnings-disclaimer">Earnings Disclaimer</Link>.</p>
      <style>{`
        .ec{padding:24px;}
        .ec-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;}
        .ec-row label{font-size:14px;color:var(--text-2);}
        .ec-row output{font-size:18px;font-weight:500;}
        .ec input[type=range]{width:100%;height:28px;}
        .ec-rate{margin-top:20px;font-size:14px;color:var(--text-2);}
        .ec-rate b{color:var(--text);font-weight:500;}
        .ec-out{display:flex;justify-content:space-between;align-items:baseline;margin-top:24px;padding-top:20px;border-top:1px solid var(--line);}
        .ec-out span{font-size:15px;color:var(--text-2);}
        .ec-out b{font-size:44px;font-weight:500;color:var(--money);letter-spacing:-0.03em;line-height:1;}
        .ec-fine{margin-top:16px;font-size:12.5px;line-height:1.6;color:var(--text-3);}
        .ec-fine a{color:var(--text-2);text-decoration:underline;text-underline-offset:2px;}
      `}</style>
    </div>
  );
}

/** Streamer budget calculator: budget ÷ all-in rate × 1,000 = views (PRD 7.2). */
export function BudgetCalculator({ feePct }: { feePct: number }) {
  const [budget, setBudget] = useState(Math.max(500, SITE.minBudget));
  const allIn = RATE * (1 + feePct / 100);
  const views = Math.floor((budget / allIn) * 1000);
  return (
    <div className="ec cf-card">
      <div className="ec-row"><label htmlFor="bc-b">Your budget</label><output className="num">${budget.toLocaleString("en-US")}</output></div>
      <input id="bc-b" type="range" min={Math.max(100, SITE.minBudget)} max={10000} step={50} value={budget} onChange={e => setBudget(+e.target.value)} />
      <div className="ec-out"><span>Gets you about</span><b className="num" style={{ color: "var(--text)" }}>{fmt(views)} views</b></div>
      <p className="ec-fine">You pay ${allIn.toFixed(2)} per 1,000 verified views: ${RATE.toFixed(2)} to clippers plus Clip Farm&apos;s {feePct}% fee. Budgets start at ${SITE.minBudget}. Card processing is shown at checkout. Unspent budget is refundable.</p>
      <style>{`.ec{padding:24px;}.ec-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;}.ec-row label{font-size:14px;color:var(--text-2);}.ec-row output{font-size:18px;font-weight:500;}.ec input[type=range]{width:100%;height:28px;}.ec-out{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid var(--line);}.ec-out span{font-size:15px;color:var(--text-2);}.ec-out b{font-size:clamp(30px,5vw,44px);font-weight:500;letter-spacing:-0.03em;line-height:1;}.ec-fine{margin-top:16px;font-size:12.5px;line-height:1.6;color:var(--text-3);}`}</style>
    </div>
  );
}
