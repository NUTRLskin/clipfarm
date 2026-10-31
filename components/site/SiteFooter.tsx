import Link from "next/link";
import { SITE } from "@/lib/site";
import Logo from "./Logo";

const COLS: { title: string; links: [string, string][] }[] = [
  { title: "Product", links: [["How it works", "/#how"], ["Earnings calculator", "/#math"], ["Pricing", "/pricing"], ["Log in", "/login"]] },
  { title: "Streamers", links: [["For streamers", "/streamers"], ["Post a contract", "/login?intent=streamer"], ["Streamer FAQ", "/streamers#faq"]] },
  { title: "Company", links: [["Contact", `mailto:${SITE.supportEmail}`], ["Help", "/#faq"], ["Accessibility", "/legal/accessibility"]] },
  { title: "Legal", links: [["All legal pages", "/legal"], ["Terms", "/legal/terms"], ["Privacy", "/legal/privacy"], ["Cookies", "/legal/cookies"], ["Clipper Terms", "/legal/clipper-terms"], ["Streamer Terms", "/legal/streamer-terms"], ["Acceptable Use", "/legal/acceptable-use"], ["DMCA", "/legal/dmca"], ["Payouts", "/legal/payouts"], ["Earnings Disclaimer", "/legal/earnings-disclaimer"], ["Data Deletion", "/legal/data-deletion"]] },
];

/** Footer with an oversized ghost wordmark behind the link columns (PRD 13.3). */
export default function SiteFooter() {
  return (
    <footer className="sf">
      <div className="sf-ghost" aria-hidden>clipfarm</div>
      <div className="sf-in">
        <div className="sf-brand">
          <Logo size={22} />
          <p>Get paid to clip streamers. One tab, from VOD to payout.</p>
        </div>
        <div className="sf-cols">
          {COLS.map(c => (
            <div key={c.title}>
              <div className="sf-h">{c.title}</div>
              <ul>{c.links.map(([label, href]) => <li key={label}><Link href={href}>{label}</Link></li>)}</ul>
            </div>
          ))}
        </div>
      </div>
      <div className="sf-base">
        <span>© 2026 {SITE.legalEntity}.</span>
        <span>Clip Farm is not affiliated with or endorsed by Twitch or TikTok.</span>
      </div>
      <style>{`
        .sf{position:relative;overflow:hidden;border-top:1px solid var(--line);background:var(--bg);margin-top:64px;}
        .sf-ghost{position:absolute;left:50%;bottom:-0.18em;transform:translateX(-50%);font-size:clamp(96px,22vw,320px);font-weight:700;letter-spacing:-0.06em;line-height:1;color:var(--text);opacity:.04;white-space:nowrap;pointer-events:none;user-select:none;}
        .sf-in{position:relative;max-width:1200px;margin:0 auto;padding:56px 16px 32px;display:grid;gap:40px;}
        .sf-brand p{margin-top:12px;font-size:14px;color:var(--text-2);max-width:280px;}
        .sf-cols{display:grid;grid-template-columns:1fr 1fr;gap:32px 24px;}
        .sf-h{font-size:12px;font-weight:500;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;}
        .sf ul{list-style:none;display:grid;gap:8px;}
        .sf li a{font-size:14px;color:var(--text-2);transition:color .15s var(--ease);}
        .sf li a:hover{color:var(--text);}
        .sf-base{position:relative;max-width:1200px;margin:0 auto;padding:20px 16px 40px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px 24px;font-size:12px;color:var(--text-3);}
        @media(min-width:900px){.sf-in{grid-template-columns:1fr 2.4fr;padding:72px 24px 40px;}.sf-cols{grid-template-columns:repeat(4,1fr);}.sf-base{padding:20px 24px 56px;justify-content:space-between;}}
      `}</style>
    </footer>
  );
}
