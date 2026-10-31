import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { SITE } from "@/lib/site";
import { MK_CSS } from "@/components/site/marketingCss";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Free for clippers, who earn $${(SITE.rateCents / 100).toFixed(2)} per 1,000 verified views and keep 100%. Streamers pay $${(SITE.rateCents / 100 * (1 + SITE.feePct / 100)).toFixed(2)} per 1,000 verified views, platform fee included.`,
};

/** The one app-wide rate (to clippers) and what streamers pay all-in, per 1,000 verified views. */
const RATE = SITE.rateCents / 100;
const ALL_IN = RATE * (1 + SITE.feePct / 100);
const usd = (n: number) => `$${n.toFixed(2)}`;
/** Thousands of verified views a $500 budget buys, rounded down (e.g. 416 at $1.20). */
const K_FOR_500 = Math.floor(500 / ALL_IN);

const CLIPPER = ["Join any contract", "Auto-Clip (Farm) on contracted VODs", "Clip editor and captions", "Post to TikTok, Reels and Shorts", `Weekly ${SITE.payoutDay} payouts, $${SITE.minPayout} minimum`, `${usd(RATE)} per 1K verified views, and you keep 100%`];
const STREAMER = [`Budgets from $${SITE.minBudget}`,"Pay only for verified views", "Clip review and clipper blocking", "Unspent budget is refundable", "Live dashboard of every clip of you", "Receipts and invoices for your records"];

const FEES: [string, string, string][] = [
  ["Joining Clip Farm", "Free", "Free"],
  ["Contract rate", `${usd(RATE)} per 1K views, you keep 100%`, `${usd(RATE)} per 1K views to clippers`],
  ["Platform fee", "None", `${SITE.feePct}% on top of the rate (${usd(ALL_IN)} per 1K views all-in)`],
  ["Minimum budget", "n/a", `$${SITE.minBudget} per contract`],
  ["Card processing", "None", "Shown at checkout (bank transfer is cheaper)"],
  ["Weekly payout", "Free", "n/a"],
];

export default function PricingPage() {
  return (
    <div className="mk">
      <SiteHeader />
      <section className="mk-hero mk-wrap" style={{ textAlign: "center" }}>
        <div className="cf-eyebrow">Pricing</div>
        <h1 className="mk-display">Simple on both sides.</h1>
        <p className="mk-lede" style={{ marginInline: "auto" }}>Clippers never pay. Streamers pay for verified views plus one flat fee. That&apos;s it.</p>
      </section>

      <section className="mk-wrap pr-cards">
        <div className="pr-card">
          <div className="pr-who">Clippers</div>
          <div className="pr-price"><span className="num">$0</span><small>forever</small></div>
          <p className="pr-desc">Get paid for every 1,000 verified views your clips get.</p>
          <Link href="/login?intent=clipper" className="cf-btn cf-btn--primary cf-btn--lg cf-btn--full">Start clipping — free <ArrowRight size={17} /></Link>
          <ul>{CLIPPER.map(f => <li key={f}><Check size={15} />{f}</li>)}</ul>
        </div>
        <div className="pr-card">
          <div className="pr-who">Streamers</div>
          <div className="pr-price"><span className="num">{usd(ALL_IN)}</span><small>per 1K verified views</small></div>
          <p className="pr-desc">{usd(RATE)} to clippers plus our {SITE.feePct}% fee. Budgets start at ${SITE.minBudget}. A $500 budget buys about {K_FOR_500}K verified views.</p>
          <Link href="/login?intent=streamer" className="cf-btn cf-btn--lg cf-btn--full">Post a contract <ArrowRight size={17} /></Link>
          <ul>{STREAMER.map(f => <li key={f}><Check size={15} />{f}</li>)}</ul>
        </div>
      </section>

      <section className="mk-sec mk-wrap">
        <h2 className="mk-h2">Every fee, in one table.</h2>
        <div className="pr-table cf-card">
          <div className="pr-tr pr-th"><span>Item</span><span>Clippers</span><span>Streamers</span></div>
          {FEES.map(([item, c, s]) => <div key={item} className="pr-tr"><span className="pr-item">{item}</span><span><em>Clippers:</em> {c}</span><span><em>Streamers:</em> {s}</span></div>)}
        </div>
        <p className="mk-p" style={{ maxWidth: 720 }}>Clipper earnings wait {SITE.holdDays} days while we check views for bots, then pay out every {SITE.payoutDay}. Full details in the <Link href="/legal/payouts" style={{ color: "var(--brand-400)" }}>Payout Policy</Link>.</p>
      </section>
      <SiteFooter />
      <style>{MK_CSS + PR_CSS}</style>
    </div>
  );
}

const PR_CSS = `
.pr-cards{display:grid;gap:16px;padding-top:16px;}
.pr-card{padding:28px 24px;border-radius:20px;background:var(--surface-1);border:1px solid var(--line);}
.pr-who{font-size:14px;font-weight:500;color:var(--brand-400);}
.pr-price{display:flex;align-items:baseline;gap:10px;margin-top:12px;}
.pr-price .num{font-size:44px;font-weight:500;letter-spacing:-0.04em;line-height:1;}
.pr-price small{font-size:14px;color:var(--text-3);}
.pr-desc{font-size:15px;color:var(--text-2);margin:12px 0 24px;min-height:48px;}
.pr-card ul{list-style:none;display:grid;gap:12px;margin-top:24px;}
.pr-card li{display:flex;gap:10px;font-size:14.5px;color:var(--text-2);}
.pr-card li svg{color:var(--brand-400);flex-shrink:0;margin-top:4px;}
.pr-table{margin-top:32px;overflow:hidden;}
.pr-tr{display:grid;gap:4px;padding:16px 20px;border-top:1px solid var(--line);font-size:14.5px;color:var(--text-2);}
.pr-tr em{font-style:normal;color:var(--text-3);}
.pr-th{display:none;border-top:none;}
.pr-item{color:var(--text);font-weight:500;}
@media(min-width:768px){
.pr-cards{grid-template-columns:1fr 1fr;max-width:920px;}
.pr-card{padding:36px 32px;}
.pr-tr{grid-template-columns:1fr 1fr 1.4fr;gap:16px;padding:16px 24px;}
.pr-tr em{display:none;}
.pr-th{display:grid;font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;}
}
`;
