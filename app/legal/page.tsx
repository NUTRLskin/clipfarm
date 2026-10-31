import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { LEGAL_PAGES } from "./_docs/meta";

export const metadata: Metadata = {
  title: "Legal",
  description: `Terms, privacy, payouts and other policies for ${SITE.name}.`,
};

export default function LegalIndex() {
  return (
    <div>
      <h1 className="cf-h1">Legal</h1>
      <p className="lg-index-intro">The agreements and policies that apply when you use {SITE.name}. Each page starts with a short plain-English summary. Questions go to <a href={`mailto:${SITE.legalEmail}`} style={{ color: "var(--brand-400)" }}>{SITE.legalEmail}</a>.</p>
      <ul className="lg-index">
        {LEGAL_PAGES.map(p => (
          <li key={p.slug}>
            <Link href={`/legal/${p.slug}`} className="cf-card">
              <span className="lg-index-t">{p.title}</span>
              <span className="lg-index-d">{p.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="lg-review">All pages last updated {SITE.legalUpdated}. These pages are provided for information and will be reviewed by counsel before launch.</p>
    </div>
  );
}
