import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { BudgetCalculator } from "@/components/site/HomeParts";
import { SITE } from "@/lib/site";
import { MK_CSS } from "@/components/site/marketingCss";

export const metadata: Metadata = {
  title: "For streamers",
  description: "Post a contract in 5 minutes. Clippers turn your VODs into TikToks. Pay per 1,000 verified views and nothing else.",
};

const CTA = "/login?intent=streamer";
/** The one app-wide rate (to clippers) and what streamers pay all-in, per 1,000 verified views. */
const RATE = SITE.rateCents / 100;
const ALL_IN = RATE * (1 + SITE.feePct / 100);
const usd = (n: number) => `$${n.toFixed(2)}`;

const STEPS = [
  { n: "01", t: "Set your budget.", b: `Pick a budget from $${SITE.minBudget}. Every contract pays clippers ${usd(RATE)} per 1,000 verified views. It takes about 5 minutes.` },
  { n: "02", t: "Clippers get to work.", b: "Clippers join your contract and turn your VODs into vertical clips for TikTok, Reels and Shorts." },
  { n: "03", t: "Pay for real views only.", b: "Views are read straight from the platforms and checked for bots. No views, no charge." },
];

const CONTROL = [
  "Every clipper follows the same Clip Farm rules, agreed to before they can join.",
  "Turn on review to approve every clip before it counts.",
  "Block any clipper from your contracts.",
  "Cap how much one clipper can earn from you.",
  "Pause or end a contract anytime. Unspent budget comes back.",
  "Every paid clip is labeled \"Paid partnership,\" so you stay on the right side of the rules.",
];

const FAQ: [string, string][] = [
  ["What do I pay for?", `Only verified views. Clippers earn ${usd(RATE)} per 1,000 verified views, and Clip Farm adds a ${SITE.feePct}% fee on top, so you pay ${usd(ALL_IN)} per 1,000. A $500 budget buys about ${Math.floor(500 / ALL_IN)}K verified views. Budgets start at $${SITE.minBudget}. Card processing is shown at checkout.`],
  ["What if my budget doesn't get used?", "End the contract and the unspent part goes back to your card once the last view checks clear. Money already paid to clippers for verified views isn't refundable."],
  ["How do you stop fake views?", `We only count views read directly from TikTok, Instagram and YouTube, hold every payout for ${SITE.holdDays} days, and flag suspicious spikes for review before anyone gets paid.`],
  ["Can clippers post anything they want?", "No. Every clipper agrees to the same Clip Farm rules at sign-up, and you can require approval on every clip. You can flag any clip of you, and rule-breaking clips stop earning."],
  ["Do I need to do anything on Twitch?", "Just keep \"Store past broadcasts\" turned on so clippers can work from your VODs. We'll check it for you when you sign in."],
];

export default function StreamersPage() {
  return (
    <div className="mk">
      <SiteHeader cta={{ href: CTA, label: "Post a contract" }} />
      <section className="mk-hero mk-wrap">
        <div className="cf-eyebrow">For streamers</div>
        <h1 className="mk-display">Get clipped everywhere.<br />Pay only for real views.</h1>
        <p className="mk-lede">Post a contract in 5 minutes. Clippers turn your VODs into TikToks. You pay per 1,000 verified views and nothing else.</p>
        <div className="mk-ctas">
          <Link href={CTA} className="cf-btn cf-btn--primary cf-btn--lg">Continue with Twitch <ArrowRight size={17} /></Link>
          <Link href="#budget" className="cf-btn cf-btn--lg">See what $500 gets you</Link>
        </div>
      </section>

      <section className="mk-sec mk-wrap">
        <h2 className="mk-h2">How it works</h2>
        <ol className="mk-steps">
          {STEPS.map(s => <li key={s.n}><span className="num">{s.n}</span><h3>{s.t}</h3><p>{s.b}</p></li>)}
        </ol>
      </section>

      <section id="budget" className="mk-sec mk-wrap mk-split">
        <div>
          <h2 className="mk-h2">Know what you&apos;re buying.</h2>
          <p className="mk-p">Slide the budget. See the views. No retainers, no editors to manage, no surprise invoices.</p>
        </div>
        <BudgetCalculator feePct={SITE.feePct} />
      </section>

      <section className="mk-sec mk-wrap mk-split">
        <div>
          <h2 className="mk-h2">You stay in control.</h2>
          <p className="mk-p">It&apos;s your face and your brand. Clip Farm gives you the switches.</p>
        </div>
        <ul className="mk-list">{CONTROL.map(c => <li key={c}><Check size={16} />{c}</li>)}</ul>
      </section>

      <section id="faq" className="mk-sec mk-wrap mk-split" style={{ alignItems: "start" }}>
        <h2 className="mk-h2">Streamer FAQ</h2>
        <div className="mk-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}<span aria-hidden>+</span></summary><p>{a}</p></details>)}</div>
      </section>

      <section className="mk-final mk-wrap">
        <h2 className="mk-display" style={{ fontSize: "clamp(34px,5.5vw,56px)" }}>Your next 100K viewers<br />are on TikTok right now.</h2>
        <Link href={CTA} className="cf-btn cf-btn--primary cf-btn--lg" style={{ marginTop: 32 }}>Post a contract <ArrowRight size={17} /></Link>
      </section>
      <SiteFooter />
      <style>{MK_CSS}</style>
    </div>
  );
}
