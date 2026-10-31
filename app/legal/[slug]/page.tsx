import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import { LEGAL_BY_SLUG, LEGAL_PAGES, isLegalSlug } from "../_docs/meta";
import { LEGAL_DOCS } from "../_docs/registry";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_PAGES.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isLegalSlug(slug)) return {};
  const meta = LEGAL_BY_SLUG[slug];
  return {
    title: meta.title,
    description: `${meta.description} ${SITE.name}.`,
    alternates: { canonical: `/legal/${slug}` },
  };
}

export default async function LegalDocPage({ params }: Props) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();
  const Doc = LEGAL_DOCS[slug];
  return <Doc />;
}
