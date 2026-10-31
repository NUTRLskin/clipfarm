"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#math", label: "Earnings" },
  { href: "/streamers", label: "For streamers" },
  { href: "/pricing", label: "Pricing" },
];

/** Marketing header: transparent over the hero, solid with a hairline after 24px of scroll (PRD 13.1). */
export default function SiteHeader({ cta = { href: "/login?intent=clipper", label: "Start clipping" } }: { cta?: { href: string; label: string } }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  return (
    <>
    <header className={`sh ${solid || open ? "sh--solid" : ""}`}>
      <div className="sh-in">
        <Link href="/" aria-label="Clip Farm home" onClick={() => setOpen(false)}><Logo size={21} /></Link>
        <nav className="sh-nav" aria-label="Main">
          {LINKS.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
        <div className="sh-right">
          <Link href="/login" className="sh-login">Log in</Link>
          <Link href={cta.href} className={`cf-btn cf-btn--sm sh-cta ${solid ? "cf-btn--primary" : ""}`}>{cta.label}</Link>
          <button className="sh-menu" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(o => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      <style>{`
        .sh{position:sticky;top:0;z-index:60;height:64px;transition:background .22s var(--ease),border-color .22s var(--ease),backdrop-filter .22s;border-bottom:1px solid transparent;}
        .sh--solid{background:rgba(10,10,12,0.82);backdrop-filter:saturate(140%) blur(14px);-webkit-backdrop-filter:saturate(140%) blur(14px);border-bottom-color:var(--line);}
        .sh-in{max-width:1200px;margin:0 auto;height:64px;padding:0 16px;display:flex;align-items:center;gap:24px;}
        .sh-nav{display:none;gap:28px;margin-left:16px;}
        .sh-nav a{font-size:14px;color:var(--text-2);transition:color .15s var(--ease);}
        .sh-nav a:hover{color:var(--text);}
        .sh-right{margin-left:auto;display:flex;align-items:center;gap:12px;}
        .sh-login{display:none;font-size:14px;color:var(--text-2);}
        .sh-login:hover{color:var(--text);}
        .sh-menu{display:flex;background:none;border:none;color:var(--text);padding:8px;margin-right:-8px;}
        .sh-sheet{position:fixed;inset:64px 0 0 0;z-index:59;background:var(--bg);padding:24px 16px;display:flex;flex-direction:column;overflow-y:auto;}
        .sh-sheet a:not(.cf-btn){font-size:24px;font-weight:600;letter-spacing:-0.02em;padding:12px 0;border-bottom:1px solid var(--line);}
        @media(max-width:340px){.sh-cta{display:none;}}
        @media(min-width:900px){.sh-nav,.sh-login{display:flex;}.sh-menu{display:none;}.sh-in{padding:0 24px;}}
      `}</style>
    </header>
      {/* Outside <header>: its backdrop-filter would trap a fixed child. */}
      {open && (
        <div className="sh-sheet cf-rise">
          {LINKS.map(l => <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>)}
          <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
          <Link href={cta.href} className="cf-btn cf-btn--primary cf-btn--lg cf-btn--full" onClick={() => setOpen(false)} style={{ marginTop: 16 }}>{cta.label}</Link>
        </div>
      )}
    </>
  );
}
