import { Server, Cloud, Building2 } from "lucide-react";

export const TIERS = [
  {
    id: "opensource",
    icon: Server,
    name: "Open Source",
    price: "Kostenlos",
    priceSub: "für immer",
    tagline: "Ideal für technisch versierte Teams und Pilotprojekte",
    highlight: false,
    badge: null,
    bullets: [
      "Self-hosted auf Ihrem eigenen Server",
      "Vollständiger Funktionsumfang, keine Einschränkungen",
      "MIT-Lizenz",
      "Community-Support via GitHub",
    ],
    cta: {
      label: "Auf GitHub ansehen",
      href: "https://github.com/g-but/kivvi",
      external: true,
      primary: false,
    },
  },
  {
    id: "cloud",
    icon: Cloud,
    name: "Cloud",
    price: "CHF 49",
    priceSub: "pro Monat",
    tagline: "Ideal für Betriebe ohne eigene IT-Infrastruktur",
    highlight: true,
    badge: "Empfohlen",
    bullets: [
      "Gehostet von revamp-it, Daten in der Schweiz",
      "Automatische Updates, Backups und Monitoring",
      "E-Mail-Support innerhalb von 48 Stunden",
      "30 Tage kostenlos testen, keine Kreditkarte nötig",
    ],
    cta: {
      label: "Kostenlos testen",
      href: "/register",
      external: false,
      primary: true,
    },
  },
  {
    id: "enterprise",
    icon: Building2,
    name: "Enterprise / On-Premise",
    price: "Auf Anfrage",
    priceSub: null,
    tagline:
      "Ideal für grössere Organisationen oder spezifische Compliance-Anforderungen",
    highlight: false,
    badge: null,
    bullets: [
      "Deployment in Ihrem eigenen Rechenzentrum oder Private Cloud",
      "Individuelle Integrationen und massgeschneiderter SLA",
      "Prioritätssupport",
      "DSGVO- und nDSG-Konformitätsdokumentation",
    ],
    cta: {
      label: "Kontakt aufnehmen",
      href: "/contact",
      external: false,
      primary: false,
    },
  },
] as const;

export type FeatureValue = "yes" | "no" | string;

export interface ComparisonFeature {
  label: string;
  opensource: FeatureValue;
  cloud: FeatureValue;
  enterprise: FeatureValue;
}

export const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    label: "Alle ERP-Funktionen",
    opensource: "yes",
    cloud: "yes",
    enterprise: "yes",
  },
  {
    label: "Unbegrenzte Benutzer",
    opensource: "yes",
    cloud: "yes",
    enterprise: "yes",
  },
  {
    label: "QR-Rechnungen",
    opensource: "yes",
    cloud: "yes",
    enterprise: "yes",
  },
  {
    label: "Automatische Backups",
    opensource: "Selbst verwaltet",
    cloud: "Inklusive",
    enterprise: "Inklusive",
  },
  {
    label: "Updates",
    opensource: "Manuell",
    cloud: "Automatisch",
    enterprise: "Automatisch",
  },
  {
    label: "E-Mail-Support",
    opensource: "Community",
    cloud: "48h",
    enterprise: "Priorität",
  },
  { label: "SLA", opensource: "no", cloud: "no", enterprise: "yes" },
  {
    label: "Daten in der Schweiz",
    opensource: "Nach Wahl",
    cloud: "yes",
    enterprise: "yes",
  },
];

export const FAQ_ITEMS = [
  {
    question: "Sind alle Features im kostenlosen Plan enthalten?",
    answer:
      "Ja, Kivvi ist vollständig Open Source unter der MIT-Lizenz. Alle Funktionen — QR-Rechnungen, Einzelartikel-Tracking, Reparaturworkflows, Buchhaltung, Impact-Berichte — sind im Self-Hosted-Plan enthalten. Es gibt keine Feature-Beschränkungen.",
  },
  {
    question: "Kann ich von Self-Hosting zu Cloud wechseln?",
    answer:
      "Ja, wir unterstützen die Migration von einer selbst gehosteten Instanz zu unserer Cloud. Schreiben Sie uns und wir begleiten den Umzug Ihrer Daten.",
  },
  {
    question: "Gibt es einen kostenlosen Test der Cloud-Version?",
    answer:
      "Ja, die Cloud-Version kann 30 Tage lang kostenlos getestet werden. Keine Kreditkarte erforderlich, kein automatisches Abo.",
  },
  {
    question: "Welche Zahlungsmethoden akzeptiert ihr?",
    answer:
      "Wir akzeptieren TWINT, Kreditkarte sowie Banküberweisung (QR-Rechnung).",
  },
];
