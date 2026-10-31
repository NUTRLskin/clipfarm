import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { FarmDemo, EarningsCalculator } from "@/components/site/HomeParts";
import { SITE } from "@/lib/site";

const CTA = "/login?intent=clipper";
/** The one app-wide rate clippers earn per 1,000 verified views, e.g. "$1.00". */
const RATE = `$${(SITE.rateCents / 100).toFixed(2)}`;

const STEPS = [
  { n: "01", t: "Join a contract.", b: `Every contract pays ${RATE} per 1,000 verified views. You pick the streamers you want to clip.` },
  { n: "02", t: "Press Farm.", b: "We scan hours of stream and hand you the best moments: cut, captioned and vertical." },
  { n: "03", t: "Post and get paid.", b: `Post to TikTok from Clip Farm. We count the views. You get paid ${SITE.payoutDay}s.` },
];

const OLD_WAY: [string, string][] = [
  ["Find a paying campaign", "Discord servers and spreadsheets"],
  ["Get the VOD", "Sketchy downloaders"],
  ["Find the moments", "Watching for hours at 2x"],
  ["Cut, crop, caption", "CapCut, one clip at a time"],
  ["Post", "Your phone, one app at a time"],
  ["Prove views, get paid", "Screenshots and chasing people"],
];

const FAQ: [string, string][] = [
  ["Do I need editing skills?", "No. Press Farm and you get clips that are already cut, vertical and captioned. You can tweak anything in the editor, but you don't have to."],
  ["How do I get paid?", `Every contract pays ${RATE} per 1,000 verified views, counted for ${SITE.viewWindowDays} days after you submit a clip. Earnings wait ${SITE.holdDays} days while we check the views, then go out every ${SITE.payoutDay} to your bank account once you have at least $${SITE.minPayout}.`],
  ["Is it free?", `Yes, for clippers. You keep 100% of the ${RATE} per 1,000 views. Streamers pay Clip Farm's fee on top.`],
  ["Is this allowed by Twitch and TikTok?", "You only clip streamers who signed a contract giving you permission to use their streams. Posting goes through TikTok's official tools, and every paid clip is labeled the way TikTok requires."],
  ["Why do clips say \"Paid partnership\"?", "Because the streamer is paying for them. The law and TikTok's rules say paid posts must be labeled. We turn the label on for you, so you never get in trouble for forgetting."],
  ["Who owns the clips?", "You own your edits. The streamer owns their stream. Joining a contract gives you permission to use their footage, and gives them and Clip Farm permission to show your clips."],
];

export default function HomePage() {
  return (
    <div className="hp">
      <SiteHeader />

      {/* 1. Hero */}
      <section className="hp-hero">
        <div className="hp-wrap hp-hero-in">
          <div className="hp-hero-copy">
            <div className="cf-eyebrow">For clippers</div>
            <h1 className="hp-display">Get paid to clip streamers.</h1>
            <p className="hp-lede">Pick a contract. Press Farm. Post to TikTok. Every verified view pays you, and you never leave this tab.</p>
            <div className="hp-ctas">
              <Link href={CTA} className="cf-btn cf-btn--primary cf-btn--lg">Start clipping — free <ArrowRight size={17} /></Link>
              <Link href="#how" className="cf-btn cf-btn--lg">See how it works</Link>
            </div>
            <ul className="hp-proof">
              <li><Check size={15} /> No editing skills needed</li>
              <li><Check size={15} /> Paid weekly</li>
              <li><Check size={15} /> Free to join</li>
            </ul>
          </div>
          <div className="hp-hero-demo"><FarmDemo /></div>
        </div>
      </section>

      {/* 2. How it works */}
      <section id="how" className="hp-sec">
        <div className="hp-wrap">
          <div className="hp-kicker">How it works</div>
          <h2 className="hp-h2">Three steps. That&apos;s the whole job.</h2>
          <ol className="hp-steps">
            {STEPS.map(s => (
              <li key={s.n}>
                <span className="hp-step-n num">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. The money moment */}
      <section className="hp-sec hp-band">
        <div className="hp-wrap hp-split">
          <div>
            <h2 className="hp-h2">3 hours of stream.<br />20 clips. One button.</h2>
            <p className="hp-p">The part that used to take all night now takes about 10 minutes. Clip Farm listens to the whole stream, finds the moments chat lost it over, and hands them to you ready to post.</p>
            <Link href={CTA} className="hp-textlink">Try it on a real VOD <ArrowRight size={15} /></Link>
          </div>
          <div className="hp-vs" aria-hidden>
            <div className="hp-vs-vod">
              <div className="hp-vs-k">One VOD</div>
              <div className="hp-vs-track"><span style={{ left: "9%" }} /><span style={{ left: "22%" }} /><span style={{ left: "37%" }} /><span style={{ left: "51%" }} /><span style={{ left: "64%" }} /><span style={{ left: "80%" }} /><span style={{ left: "91%" }} /></div>
              <div className="hp-vs-len num">3:12:44</div>
            </div>
            <div className="hp-vs-k" style={{ marginTop: 20 }}>20 clips</div>
            <div className="hp-vs-grid">{Array.from({ length: 20 }, (_, i) => <span key={i} />)}</div>
          </div>
        </div>
      </section>

      {/* 4. Earnings calculator */}
      <section id="math" className="hp-sec">
        <div className="hp-wrap hp-split">
          <div>
            <div className="hp-kicker">Earnings</div>
            <h2 className="hp-h2">Do the math.</h2>
            <p className="hp-p">Every contract pays {RATE} per 1,000 verified views your clips get. No follower minimum. No pitch deck. Just views.</p>
            <p className="hp-p" style={{ color: "var(--text-3)" }}>One rate on every contract. No haggling, no guessing which deal pays more.</p>
          </div>
          <EarningsCalculator />
        </div>
      </section>

      {/* 5. Old way vs Clip Farm */}
      <section className="hp-sec">
        <div className="hp-wrap">
          <div className="hp-kicker">Why Clip Farm</div>
          <h2 className="hp-h2">Six apps. Or one.</h2>
          <div className="hp-table cf-card">
            <div className="hp-tr hp-th"><span>The job</span><span>The old way</span><span>Clip Farm</span></div>
            {OLD_WAY.map(([job, old]) => (
              <div key={job} className="hp-tr">
                <span className="hp-job">{job}</span>
                <span className="hp-old"><Minus size={14} />{old}</span>
                <span className="hp-new"><Check size={15} />Built in</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Getting paid */}
      <section className="hp-sec">
        <div className="hp-wrap">
          <h2 className="hp-h2">Getting paid should be boring.<br />Ours is.</h2>
          <div className="hp-pay">
            <div><b>Views straight from TikTok.</b><p>We read view counts from TikTok itself. No screenshots, no arguing.</p></div>
            <div><b>{SITE.holdDays}-day check, then {SITE.payoutDay}.</b><p>Views get checked for bots, then your money goes out every {SITE.payoutDay}.</p></div>
            <div><b>You keep 100%.</b><p>{RATE} per 1,000 verified views, all of it yours. Streamers pay our fee, not you.</p></div>
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section id="faq" className="hp-sec">
        <div className="hp-wrap hp-faq-wrap">
          <h2 className="hp-h2">Questions, answered.</h2>
          <div className="hp-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}<span aria-hidden>+</span></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Streamer band */}
      <section className="hp-wrap">
        <div className="hp-streamer">
          <div>
            <h2>Streamer? Get clipped everywhere.</h2>
            <p>Set a budget from ${SITE.minBudget} and clippers turn your VODs into TikToks. Pay only for real views.</p>
          </div>
          <Link href="/streamers" className="cf-btn cf-btn--lg hp-streamer-btn">For streamers <ArrowRight size={17} /></Link>
        </div>
      </section>

      {/* 10. Final CTA */}
      <section className="hp-final hp-wrap">
        <h2 className="hp-display" style={{ fontSize: "clamp(36px,6vw,64px)" }}>Your first clip is<br />10 minutes away.</h2>
        <p className="hp-lede">You&apos;ve watched other people win with clips long enough. Your turn.</p>
        <Link href={CTA} className="cf-btn cf-btn--primary cf-btn--lg">Start clipping — free <ArrowRight size={17} /></Link>
      </section>

      <SiteFooter />

      <style>{`
        .hp{background:var(--bg);overflow-x:clip;}
        .hp-wrap{max-width:1200px;margin:0 auto;padding-left:16px;padding-right:16px;}
        .hp-hero{padding:40px 0 64px;}
        .hp-hero-in{display:grid;gap:48px;align-items:center;}
        .hp-display{font-size:clamp(40px,7vw,68px);line-height:1.02;font-weight:600;letter-spacing:-0.045em;margin-top:14px;}
        .hp-lede{font-size:clamp(16px,1.6vw,19px);line-height:1.55;color:var(--text-2);margin-top:20px;max-width:520px;}
        .hp-ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px;}
        .hp-proof{list-style:none;display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:24px;font-size:13.5px;color:var(--text-2);}
        .hp-proof li{display:flex;align-items:center;gap:6px;}
        .hp-proof svg{color:var(--brand-400);}
        .hp-sec{padding:72px 0;}
        .hp-kicker{font-size:13px;font-weight:500;color:var(--brand-400);margin-bottom:12px;}
        .hp-h2{font-size:clamp(30px,4.2vw,46px);line-height:1.08;font-weight:600;letter-spacing:-0.035em;}
        .hp-p{font-size:16px;line-height:1.65;color:var(--text-2);margin-top:16px;max-width:480px;}
        .hp-steps{list-style:none;display:grid;gap:16px;margin-top:40px;}
        .hp-steps li{padding:28px 24px;border-radius:16px;background:var(--surface-1);border:1px solid var(--line);}
        .hp-step-n{font-size:13px;color:var(--brand-400);}
        .hp-steps h3{font-size:22px;font-weight:600;letter-spacing:-0.02em;margin-top:28px;}
        .hp-steps p{font-size:15px;color:var(--text-2);margin-top:8px;}
        .hp-band{background:var(--surface-1);border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
        .hp-split{display:grid;gap:40px;align-items:center;}
        .hp-textlink{display:inline-flex;align-items:center;gap:6px;margin-top:24px;font-size:15px;font-weight:500;color:var(--brand-400);}
        .hp-vs{padding:24px;border-radius:16px;background:var(--bg);border:1px solid var(--line);}
        .hp-vs-k{font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;}
        .hp-vs-vod{position:relative;}
        .hp-vs-track{position:relative;height:40px;border-radius:8px;background:var(--surface-2);}
        .hp-vs-track span{position:absolute;top:6px;bottom:6px;width:3px;border-radius:2px;background:var(--brand-400);}
        .hp-vs-len{position:absolute;right:0;top:0;font-size:12px;color:var(--text-2);}
        .hp-vs-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:6px;}
        .hp-vs-grid span{aspect-ratio:9/16;border-radius:5px;background:var(--surface-3);border-top:12px solid #1E1B2E;}
        .hp-table{margin-top:40px;overflow:hidden;}
        .hp-tr{display:grid;grid-template-columns:1fr;gap:4px;padding:16px 20px;border-top:1px solid var(--line);font-size:14.5px;}
        .hp-th{display:none;border-top:none;font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;}
        .hp-job{font-weight:500;}
        .hp-old{display:flex;align-items:center;gap:8px;color:var(--text-3);}
        .hp-new{display:flex;align-items:center;gap:8px;color:var(--text);}
        .hp-new svg{color:var(--brand-400);}
        .hp-pay{display:grid;gap:12px;margin-top:40px;}
        .hp-pay>div{padding:24px;border-radius:16px;border:1px solid var(--line);}
        .hp-pay b{font-size:17px;font-weight:600;}
        .hp-pay p{font-size:15px;color:var(--text-2);margin-top:6px;}
        .hp-faq-wrap{display:grid;gap:32px;}
        .hp-faq details{border-top:1px solid var(--line);}
        .hp-faq details:last-child{border-bottom:1px solid var(--line);}
        .hp-faq summary{list-style:none;display:flex;justify-content:space-between;gap:16px;padding:20px 0;font-size:17px;font-weight:500;cursor:pointer;}
        .hp-faq summary::-webkit-details-marker{display:none;}
        .hp-faq summary span{color:var(--text-3);font-size:22px;line-height:1;transition:transform .22s var(--ease);}
        .hp-faq details[open] summary span{transform:rotate(45deg);}
        .hp-faq p{font-size:15.5px;line-height:1.65;color:var(--text-2);padding:0 0 22px;max-width:640px;}
        .hp-streamer{display:grid;gap:24px;padding:36px 28px;border-radius:20px;background:var(--brand-900);margin:32px 0 0;}
        .hp-streamer h2{font-size:clamp(24px,3vw,32px);font-weight:600;letter-spacing:-0.03em;line-height:1.15;}
        .hp-streamer p{font-size:16px;color:rgba(255,255,255,0.72);margin-top:10px;max-width:520px;}
        .hp-streamer-btn{background:#fff;color:#0A0A0C;border-color:#fff;justify-self:start;}
        .hp-streamer-btn:hover{background:#ECE7FF;border-color:#ECE7FF;}
        .hp-final{text-align:center;padding-top:112px;padding-bottom:40px;display:flex;flex-direction:column;align-items:center;}
        .hp-final .hp-lede{margin:20px auto 32px;}
        @media(min-width:768px){
          .hp-wrap{padding-left:24px;padding-right:24px;}
          .hp-steps{grid-template-columns:repeat(3,1fr);}
          .hp-pay{grid-template-columns:repeat(3,1fr);}
          .hp-tr{grid-template-columns:1fr 1.3fr 1fr;align-items:center;gap:16px;padding:16px 24px;}
          .hp-th{display:grid;}
          .hp-streamer{grid-template-columns:1fr auto;align-items:center;padding:48px;}
          .hp-sec{padding:104px 0;}
        }
        @media(min-width:1000px){
          .hp-hero{padding:72px 0 88px;}
          .hp-hero-in{grid-template-columns:1fr 1.08fr;}
          .hp-split{grid-template-columns:1fr 1fr;gap:72px;}
          .hp-faq-wrap{grid-template-columns:1fr 1.6fr;align-items:start;}
        }
      `}</style>
    </div>
  );
}
