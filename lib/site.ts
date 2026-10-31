/** One place for company facts used across the marketing site and legal pages. Fill the TODOs before launch. */
export const SITE = {
  name: "Clip Farm",
  legalEntity: "Clip Farm, a CJS Media company", // TODO(CJ): exact legal entity name once the LLC/DBA is decided
  state: "California",
  supportEmail: "support@clipfarm.app", // TODO(CJ): confirm domain + inboxes
  legalEmail: "legal@clipfarm.app",
  privacyEmail: "privacy@clipfarm.app",
  dmcaEmail: "dmca@clipfarm.app",
  mailingAddress: "[Mailing address — add before launch]", // TODO(CJ)
  legalUpdated: "2026-10-31",
  payoutDay: "Friday",
  holdDays: 7,
  minPayout: 10,
  feePct: 20,
  /** Default app-wide rate (cents per 1,000 verified views). The live value is app_settings.rate_cents, changed only by an Owner. */
  rateCents: 100,
  viewWindowDays: 30,
  minBudget: 100,
};
