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
export const LANDING_NAV_LINKS = [
  { href: "/how-it-works", labelKey: "navHowItWorks" as const },
  { href: "/knowledge", labelKey: "navKnowledge" as const },
  { href: "/contact", labelKey: "navContact" as const },
];

export const CONDITION_GRADES = [
  {
    label: "Gut",
    desc: "Kaum Gebrauchsspuren, voll funktionsfähig",
    colorClass:
      "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200",
  },
  {
    label: "Mittel",
    desc: "Sichtbare Gebrauchsspuren, funktionsfähig",
    colorClass:
      "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200",
  },
  {
    label: "Schlecht",
    desc: "Starke Abnutzung, funktioniert noch",
    colorClass:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200",
  },
  {
    label: "Für Teile",
    desc: "Teilweise defekt, als Ersatzteillager",
    colorClass:
      "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200",
  },
  {
    label: "Schrott",
    desc: "Nicht reparierbar, Recycling",
    colorClass: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200",
  },
];
