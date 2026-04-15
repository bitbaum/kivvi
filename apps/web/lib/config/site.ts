export const SITE_URL = "https://kivvi.ch";
export const CONTACT_EMAIL = "info@revamp-it.ch";

export const VERTICALS = [
  {
    id: "it-refurbishers",
    href: "/for/it-refurbishers",
    title: "IT-Refurbisher",
    description:
      "Einzelartikel-Tracking, Reparaturkosten pro Gerät, Kivitendo-Migration",
    hook: "Laptop #47 mit Seriennummer, Reparaturkosten und Marge — nicht «100 ThinkPad auf Lager».",
    bullets: [
      "Reparaturkosten akkumulieren sich pro Gerät",
      "Zustand, Akku, Marge — auf einen Blick",
      "Spendenquittungen und Impact-Bericht automatisch",
    ],
  },
  {
    id: "brockenhaeuser",
    href: "/for/brockenhaeuser",
    title: "Brockenhäuser",
    description: "Spendenquittungen, Donormanagement, Impact für Förderanträge",
    hook: "Spendenquittungen auf Knopfdruck — nicht mehr in Word getippt.",
    bullets: [
      "Strukturierter Wareneingang für Spenden und Einkäufe",
      "Donorenverwaltung und Impact-Nachweis für Förderanträge",
      "Schweizer QR-Rechnungen und MWST nativ",
    ],
  },
  {
    id: "repair-cafes",
    href: "/for/repair-cafes",
    title: "Repair Cafés",
    description: "Reparaturprotokoll, Stunden-Tracking, Impact-Nachweis",
    hook: "Was repariert, von wem, welche Teile, wie viel CO₂ — ohne Excel.",
    bullets: [
      "Auftragserfassung auch für Freiwillige ohne IT-Kenntnisse",
      "Reparaturhistorie pro Gerät für Folgereparaturen",
      "Impact-Bericht auf Knopfdruck für Förderanträge",
    ],
  },
  {
    id: "vintage",
    href: "/for/vintage",
    title: "Vintage-Shops",
    description: "Zustandsbewertung, Kommissions-Tracking, QR-Etiketten",
    hook: "Jedes Stück einmalig — mit Zustand, Herkunft und eigenem Preis.",
    bullets: [
      "Kein SKU-Denken: jedes Teil ist ein eigener Artikel",
      "Kommissionsverkauf mit Auszahlungsabrechnung",
      "Zustandssystem und Provenienz pro Stück",
    ],
  },
] as const;

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

export const CONDITION_GRADES = [
  {
    label: "Gut",
    desc: "Kaum Gebrauchsspuren, voll funktionsfähig",
    colorClass:
      "bg-success/10 text-success",
  },
  {
    label: "Mittel",
    desc: "Sichtbare Gebrauchsspuren, funktionsfähig",
    colorClass: "bg-info/10 text-info",
  },
  {
    label: "Schlecht",
    desc: "Starke Abnutzung, funktioniert noch",
    colorClass: "bg-warning/10 text-warning",
  },
  {
    label: "Für Teile",
    desc: "Teilweise defekt, als Ersatzteillager",
    colorClass: "bg-warning/10 text-warning",
  },
  {
    label: "Schrott",
    desc: "Nicht reparierbar, Recycling",
    colorClass: "bg-destructive/10 text-destructive",
  },
];

// ============================================================================
// METADATA HELPERS
// ============================================================================

/**
 * Generates consistent openGraph + twitter metadata for landing pages.
 * Spread this into your page's `metadata` export alongside title/description.
 *
 * Usage:
 *   export const metadata: Metadata = {
 *     title: "...",
 *     description: "...",
 *     ...buildPageMeta("...", "..."),
 *   };
 */
export function buildPageMeta(title: string, description: string) {
  return {
    openGraph: {
      title,
      description,
      type: "website" as const,
      locale: "de_CH",
      siteName: "Kivvi",
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}
