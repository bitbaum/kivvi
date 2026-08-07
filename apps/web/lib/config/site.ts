import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
// Where the site ACTUALLY serves. kivvi.ch has no DNS A record, so everything
// derived from this — metadataBase, canonical URLs, the social preview — named
// a host that does not resolve. Point it back only once that domain is live.
export const SITE_URL = "https://kivvi.orangecat.ch";
export const CONTACT_EMAIL = "info@revamp-it.ch";

/**
 * Marketing verticals (target customer segments). Holds only structural
 * data — title/description/hook/bullets live in messages/{locale}.json
 * under landing.verticals.{id}.* (SSOT for translation).
 */
export const VERTICALS = [
  { id: "it-refurbishers", href: "/for/it-refurbishers" },
  { id: "brockenhaeuser", href: "/for/brockenhaeuser" },
  { id: "repair-cafes", href: "/for/repair-cafes" },
  { id: "vintage", href: "/for/vintage" },
] as const;

export type VerticalId = (typeof VERTICALS)[number]["id"];

// Primary nav links (flat). Verticals surface via the "Für wen" dropdown.
// Wissen surfaces via its own dropdown — not listed here.
export const LANDING_NAV_LINKS = [
  { href: "/how-it-works", labelKey: "navHowItWorks" as const },
  { href: "/roadmap", labelKey: "navRoadmap" as const },
  { href: "/contact", labelKey: "navContact" as const },
];

// SSOT for the context links at the bottom of the Solutions dropdown.
// Previously hardcoded in landing-nav.tsx.
export const SOLUTIONS_CONTEXT_LINKS = [
  { href: "/circular-economy", label: "Kreislaufwirtschaft verstehen" },
  { href: "/why-kivvi", label: "Warum Kivvi" },
] as const;

// Featured article slugs shown in the Wissen dropdown.
// Order matters — shown top to bottom.
// Resolved against KNOWLEDGE_ARTICLES in landing-header.tsx.
export const WISSEN_FEATURED_SLUGS = [
  "kreislaufwirtschaft-software-problem",
  "zustandsbewertung",
  "qr-rechnung-schweiz",
  "impact-messen",
] as const;

/**
 * Visual config for the 5-grade condition scale used on landing pages.
 * Labels live in messages/{locale}.json under inventory.condition* (SSOT);
 * descriptions live under landing.howItWorks.conditions.* per locale.
 */
export const CONDITION_GRADES = [
  { id: "good", colorClass: "bg-success/10 text-success" },
  { id: "fair", colorClass: "bg-info/10 text-info" },
  { id: "poor", colorClass: "bg-warning/10 text-warning" },
  { id: "parts_only", colorClass: "bg-warning/10 text-warning" },
  { id: "scrap", colorClass: "bg-destructive/10 text-destructive" },
] as const;

export type ConditionGradeId = (typeof CONDITION_GRADES)[number]["id"];

/** Maps a CONDITION_GRADES entry id → the inventory.* label key. */
export const CONDITION_GRADE_LABEL_KEY: Record<ConditionGradeId, string> = {
  good: "conditionGood",
  fair: "conditionFair",
  poor: "conditionPoor",
  parts_only: "conditionPartsOnly",
  scrap: "conditionScrap",
};

// ============================================================================
// METADATA HELPERS
// ============================================================================

/** next-intl locale → og:locale mapping. Falls back to de_CH. */
const OG_LOCALE_BY_NEXTINTL: Record<string, string> = {
  [DEFAULT_LOCALE]: "de_CH",
  en: "en_US",
  fr: "fr_CH",
};

/**
 * Generates consistent openGraph + twitter metadata for landing pages.
 *
 * Usage in a Next.js page (server component):
 *   export async function generateMetadata(): Promise<Metadata> {
 *     const t = await getTranslations("landing.<page>.metadata");
 *     const locale = await getLocale();
 *     const title = t("title");
 *     const description = t("description");
 *     return {
 *       title,
 *       description,
 *       ...buildPageMeta(title, description, locale),
 *     };
 *   }
 */
export function buildPageMeta(
  title: string,
  description: string,
  locale: string = DEFAULT_LOCALE,
) {
  // No `images` here on purpose. /og-image.png does not exist in this repo, and
  // naming it explicitly OVERRODE the generated opengraph-image.tsx cards that
  // do — so the site advertised a preview file it had never shipped. Omitting
  // the key lets Next's file convention supply the real image per route.
  return {
    openGraph: {
      title,
      description,
      type: "website" as const,
      locale: OG_LOCALE_BY_NEXTINTL[locale] ?? "de_CH",
      siteName: "Kivvi",
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
    },
  };
}
