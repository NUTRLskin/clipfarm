"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LEGAL_PAGES } from "./_docs/meta";

/** Sticky side list on desktop, scrollable chip row on phone. Highlights the current page. */
export default function LegalNav() {
  const path = usePathname();
  const chips = useRef<HTMLDivElement>(null);

  // Keep the active chip in view on phone without scrolling the page vertically.
  useEffect(() => {
    const row = chips.current;
    const active = row?.querySelector<HTMLElement>("[aria-current=page]");
    if (row && active) row.scrollLeft = active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2;
  }, [path]);

  return (
    <>
      <nav className="lg-side" aria-label="Legal pages">
        <Link href="/legal" className="lg-side-h" aria-current={path === "/legal" ? "page" : undefined}>Legal</Link>
        <ul>
          {LEGAL_PAGES.map(p => {
            const href = `/legal/${p.slug}`;
            return <li key={p.slug}><Link href={href} aria-current={path === href ? "page" : undefined}>{p.title}</Link></li>;
          })}
        </ul>
      </nav>
      <nav className="lg-chips" aria-label="Legal pages" ref={chips}>
        {LEGAL_PAGES.map(p => {
          const href = `/legal/${p.slug}`;
          return <Link key={p.slug} href={href} aria-current={path === href ? "page" : undefined}>{p.short}</Link>;
        })}
      </nav>
    </>
  );
}
