import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import { LEGAL_BY_SLUG, type LegalSlug } from "./meta";

/** Document shell: H1, last-updated line, body, and the pre-launch review note. */
export function Doc({ slug, children }: { slug: LegalSlug; children: ReactNode }) {
  return (
    <article className="lg-doc">
      <h1 className="cf-h1">{LEGAL_BY_SLUG[slug].title}</h1>
      <p className="lg-updated">Last updated <time dateTime={SITE.legalUpdated}>{SITE.legalUpdated}</time></p>
      {children}
      <p className="lg-review">This page is provided for information and will be reviewed by counsel before launch.</p>
    </article>
  );
}

/** "The short version" summary box. Not a substitute for the full text. */
export function Short({ items }: { items: ReactNode[] }) {
  return (
    <aside className="lg-short cf-card" aria-label="The short version">
      <h2>The short version</h2>
      <ul>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
      <p>This summary is for convenience. The full text below is what applies.</p>
    </aside>
  );
}

/** A numbered section with a stable anchor (#s-3). */
export function Sec({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="lg-sec" id={`s-${n}`} aria-labelledby={`s-${n}-h`}>
      <h2 id={`s-${n}-h`}><span className="lg-n">{n}.</span> {title}</h2>
      {children}
    </section>
  );
}

/** Highlighted callout for points that must not be missed. */
export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="lg-callout" role="note">
      {title && <p className="lg-callout-t">{title}</p>}
      {children}
    </div>
  );
}

export function Mail({ to }: { to: string }) {
  return <a href={`mailto:${to}`}>{to}</a>;
}

export function DocLink({ slug, children }: { slug: LegalSlug; children?: ReactNode }) {
  return <Link href={`/legal/${slug}`}>{children ?? LEGAL_BY_SLUG[slug].title}</Link>;
}

/** Final contact line every page ends with. */
export function Contact({ email, extra }: { email: string; extra?: ReactNode }) {
  return (
    <p className="lg-contact">
      Questions about this page? Email <Mail to={email} />{extra}. Mail: {SITE.legalEntity}, {SITE.mailingAddress}.
    </p>
  );
}

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
