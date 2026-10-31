import type { ReactNode } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import LegalNav from "./LegalNav";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="lg-wrap">
        <div className="lg-grid">
          <LegalNav />
          <main className="lg-main" id="main">{children}</main>
        </div>
      </div>
      <SiteFooter />
      <style>{CSS}</style>
    </>
  );
}

const CSS = `
.lg-wrap{max-width:1200px;margin:0 auto;padding:24px 16px 0;}
.lg-main{min-width:0;max-width:720px;}

/* Nav: chips on phone, sticky list on desktop */
.lg-side{display:none;}
.lg-chips{display:flex;gap:8px;overflow-x:auto;margin:0 -16px 28px;padding:0 16px 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
.lg-chips::-webkit-scrollbar{display:none;}
.lg-chips a{flex:none;font-size:13px;line-height:1;padding:9px 12px;border-radius:999px;border:1px solid var(--line-strong);color:var(--text-2);white-space:nowrap;transition:color .15s var(--ease),border-color .15s var(--ease);}
.lg-chips a:hover{color:var(--text);}
.lg-chips a[aria-current=page]{color:var(--brand-400);border-color:var(--brand-400);background:var(--brand-tint);}

@media(min-width:900px){
  .lg-wrap{padding:48px 24px 0;}
  .lg-grid{display:grid;grid-template-columns:220px minmax(0,1fr);gap:64px;align-items:start;}
  .lg-chips{display:none;}
  .lg-side{display:block;position:sticky;top:96px;}
  .lg-side-h{display:block;font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:12px;}
  .lg-side-h[aria-current=page]{color:var(--brand-400);}
  .lg-side ul{list-style:none;display:grid;gap:2px;border-left:1px solid var(--line);}
  .lg-side li a{display:block;font-size:14px;line-height:20px;padding:6px 0 6px 14px;margin-left:-1px;border-left:2px solid transparent;color:var(--text-2);transition:color .15s var(--ease);}
  .lg-side li a:hover{color:var(--text);}
  .lg-side li a[aria-current=page]{color:var(--brand-400);border-left-color:var(--brand-400);font-weight:500;}
}

/* Document typography */
.lg-doc{font-size:15px;line-height:1.7;color:var(--text-2);}
.lg-doc .cf-h1{color:var(--text);}
.lg-updated{margin-top:8px;font-size:13px;color:var(--text-3);font-family:var(--font-mono),ui-monospace,monospace;}
.lg-doc p+p{margin-top:12px;}
.lg-doc a{color:var(--brand-400);text-decoration:underline;text-decoration-color:rgba(167,139,250,.4);text-underline-offset:3px;overflow-wrap:anywhere;}
.lg-doc a:hover{text-decoration-color:var(--brand-400);}
.lg-doc strong{color:var(--text);font-weight:600;}
.lg-doc ul,.lg-doc ol{margin:12px 0 0;padding-left:22px;display:grid;gap:8px;}
.lg-doc li ul{margin-top:8px;}
.lg-doc li::marker{color:var(--text-3);}
.lg-doc ul+p,.lg-doc ol+p,.lg-doc .lg-table+p,.lg-doc .lg-callout+p{margin-top:12px;}
.lg-doc code{font-family:var(--font-mono),ui-monospace,monospace;font-size:13px;color:var(--text);}

.lg-short{margin-top:28px;padding:20px 20px 18px;}
.lg-short h2{font-size:15px;font-weight:600;color:var(--text);}
.lg-short ul{margin-top:10px;}
.lg-short>p{margin-top:12px;font-size:13px;color:var(--text-3);}

.lg-sec{margin-top:40px;scroll-margin-top:88px;}
.lg-sec h2{font-size:18px;line-height:26px;font-weight:600;color:var(--text);margin-bottom:12px;letter-spacing:-0.01em;}
.lg-n{color:var(--text-3);font-variant-numeric:tabular-nums;}

.lg-callout{margin-top:16px;padding:16px 18px;border:1px solid var(--line-strong);border-left:3px solid var(--brand-400);border-radius:var(--r-sm);background:var(--surface-1);}
.lg-callout-t{font-weight:600;color:var(--text);margin-bottom:6px;}
.lg-callout .lg-big{font-size:17px;line-height:1.6;color:var(--text);}
.lg-doc>.lg-callout:first-of-type{margin-top:28px;}

.lg-table{margin-top:12px;overflow-x:auto;border:1px solid var(--line);border-radius:var(--r-sm);}
.lg-table table{width:100%;min-width:520px;border-collapse:collapse;font-size:14px;line-height:1.55;}
.lg-table th,.lg-table td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line);}
.lg-table tr:last-child th,.lg-table tr:last-child td{border-bottom:none;}
.lg-table thead th{font-size:12px;font-weight:500;color:var(--text-3);background:var(--surface-1);}
.lg-table tbody th{font-weight:500;color:var(--text);}

.lg-contact{margin-top:48px;padding-top:20px;border-top:1px solid var(--line);}
.lg-review{margin-top:16px;font-size:12px;line-height:1.6;color:var(--text-3);}

/* Index */
.lg-index-intro{margin-top:8px;font-size:15px;line-height:1.7;color:var(--text-2);}
.lg-index{list-style:none;margin-top:28px;display:grid;gap:12px;}
.lg-index a{display:block;padding:16px 18px;transition:border-color .15s var(--ease);}
.lg-index a:hover{border-color:var(--line-strong);}
.lg-index-t{display:block;font-size:16px;font-weight:600;color:var(--brand-400);}
.lg-index-d{display:block;margin-top:4px;font-size:14px;line-height:1.6;color:var(--text-2);}
`;
