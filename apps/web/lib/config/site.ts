export const CONTACT_EMAIL = "info@revamp-it.ch";

export const VERTICALS = [
  {
    id: "it-refurbishers",
    href: "/for/it-refurbishers",
    title: "IT-Refurbisher & Computer-Recycler",
    description:
      "Einzelartikel-Tracking, Reparaturkosten pro Gerät, Kivitendo-Migration",
  },
  {
    id: "brockenhaeuser",
    href: "/for/brockenhaeuser",
    title: "Brockenhäuser & Sozialkaufhäuser",
    description: "Spendenquittungen, Donormanagement, Impact für Förderanträge",
  },
  {
    id: "repair-cafes",
    href: "/for/repair-cafes",
    title: "Repair Cafés & Werkstätten",
    description: "Reparaturprotokoll, Stunden-Tracking, Impact-Nachweis",
  },
  {
    id: "vintage",
    href: "/for/vintage",
    title: "Vintage-Shops & Kleiderbörsen",
    description: "Zustandsbewertung, Kommissions-Tracking, QR-Etiketten",
  },
];

export const LANDING_NAV_LINKS = [
  { href: "/circular-economy", labelKey: "navCircularEconomy" as const },
  { href: "/how-it-works", labelKey: "navHowItWorks" as const },
  { href: "/why-kivvi", labelKey: "navWhyKivvi" as const },
  { href: "/knowledge", labelKey: "navKnowledge" as const },
  { href: "/faq", labelKey: "navFaq" as const },
  { href: "/about", labelKey: "navAbout" as const },
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

export const VERTICAL_NAV_LINKS = [
  { href: "/for/it-refurbishers", labelKey: "navForItRefurbishers" as const },
  { href: "/for/brockenhaeuser", labelKey: "navForBrockenhaus" as const },
  { href: "/for/repair-cafes", labelKey: "navForRepairCafes" as const },
  { href: "/for/vintage", labelKey: "navForVintage" as const },
];
