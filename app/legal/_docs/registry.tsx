import type { ComponentType } from "react";
import type { LegalSlug } from "./meta";
import Terms from "./terms";
import Privacy from "./privacy";
import Cookies from "./cookies";
import ClipperTerms from "./clipper-terms";
import StreamerTerms from "./streamer-terms";
import AcceptableUse from "./acceptable-use";
import Dmca from "./dmca";
import Payouts from "./payouts";
import EarningsDisclaimer from "./earnings-disclaimer";
import DataDeletion from "./data-deletion";
import Accessibility from "./accessibility";

export const LEGAL_DOCS: Record<LegalSlug, ComponentType> = {
  terms: Terms,
  privacy: Privacy,
  cookies: Cookies,
  "clipper-terms": ClipperTerms,
  "streamer-terms": StreamerTerms,
  "acceptable-use": AcceptableUse,
  dmca: Dmca,
  payouts: Payouts,
  "earnings-disclaimer": EarningsDisclaimer,
  "data-deletion": DataDeletion,
  accessibility: Accessibility,
};
