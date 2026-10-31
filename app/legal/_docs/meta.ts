/** Titles and one-line descriptions for every legal page. No JSX here so the client nav can import it cheaply. */
export type LegalSlug =
  | "terms"
  | "privacy"
  | "cookies"
  | "clipper-terms"
  | "streamer-terms"
  | "acceptable-use"
  | "dmca"
  | "payouts"
  | "earnings-disclaimer"
  | "data-deletion"
  | "accessibility";

export type LegalMeta = { slug: LegalSlug; title: string; short: string; description: string };

export const LEGAL_PAGES: LegalMeta[] = [
  { slug: "terms", title: "Terms of Service", short: "Terms", description: "The main agreement for using Clip Farm, including fees, disputes and arbitration." },
  { slug: "privacy", title: "Privacy Policy", short: "Privacy", description: "What personal data we collect, why, who we share it with, and your California privacy rights." },
  { slug: "cookies", title: "Cookie Policy", short: "Cookies", description: "The cookies and local storage we use, and how to control them." },
  { slug: "clipper-terms", title: "Clipper Terms", short: "Clipper Terms", description: "Extra rules for clippers: joining contracts, posting, disclosure, earnings and fraud." },
  { slug: "streamer-terms", title: "Streamer Terms", short: "Streamer Terms", description: "Extra rules for streamers: contracts, budgets, licenses, approvals, refunds and chargebacks." },
  { slug: "acceptable-use", title: "Acceptable Use Policy", short: "Acceptable Use", description: "What you can and cannot post or do on Clip Farm, and how we enforce it." },
  { slug: "dmca", title: "Copyright and DMCA Policy", short: "DMCA", description: "How to report copyright infringement, file a counter-notice, and our repeat-infringer policy." },
  { slug: "payouts", title: "Payouts Policy", short: "Payouts", description: "How earnings are counted, held, reviewed and paid, and how to appeal a reversal." },
  { slug: "earnings-disclaimer", title: "Earnings Disclaimer", short: "Earnings Disclaimer", description: "Plain facts about what clippers can expect to earn. No guarantees." },
  { slug: "data-deletion", title: "Data Deletion", short: "Data Deletion", description: "How to delete your account and data, what we keep, and how long it takes." },
  { slug: "accessibility", title: "Accessibility Statement", short: "Accessibility", description: "Our accessibility target, known limits, and how to report a barrier." },
];

export const LEGAL_BY_SLUG = Object.fromEntries(LEGAL_PAGES.map(p => [p.slug, p])) as Record<LegalSlug, LegalMeta>;

export function isLegalSlug(s: string): s is LegalSlug {
  return Object.prototype.hasOwnProperty.call(LEGAL_BY_SLUG, s);
}
