import { Check, Hammer, Calendar, Lightbulb } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Support = "yes" | "partial" | "no";

export interface CompetitorFeature {
  feature: string;
  desc: string;
  bexio: Support;
  odoo: Support;
  abacus: Support;
  kivitendo: Support;
  repairshopr: Support;
  kivvi: Support;
}

// ─────────────────────────────────────────────────────────────────────────────
// Competitor data
// ─────────────────────────────────────────────────────────────────────────────

export const COMPARISON: CompetitorFeature[] = [
  {
    feature: "Einzelartikel-Tracking",
    desc: "Jedes Gerät mit eigener ID, Geschichte und Kosten",
    bexio: "no",
    odoo: "partial",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "yes",
    kivvi: "yes",
  },
  {
    feature: "Zustandsbewertung",
    desc: "5-stufige Klassifikation (Gut / Mittel / Schlecht / Teile / Schrott)",
    bexio: "no",
    odoo: "no",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "partial",
    kivvi: "yes",
  },
  {
    feature: "Intake-Workflow",
    desc: "Wareneingang ohne Bestellung — Spenden, Rücknahmen, Tausch",
    bexio: "no",
    odoo: "no",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "yes",
    kivvi: "yes",
  },
  {
    feature: "Reparatur-Workflow",
    desc: "Techniker, Teile, Arbeitszeit, Qualitätsgates per Artikel",
    bexio: "no",
    odoo: "partial",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "yes",
    kivvi: "partial",
  },
  {
    feature: "Schweizer QR-Rechnung",
    desc: "Gesetzeskonforme QR-Zahlscheine — Pflicht seit 2022",
    bexio: "yes",
    odoo: "partial",
    abacus: "yes",
    kivitendo: "yes",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    feature: "Doppelte Buchführung",
    desc: "Vollständige Finanzbuchhaltung, Bilanz, GuV, MWST",
    bexio: "yes",
    odoo: "yes",
    abacus: "yes",
    kivitendo: "yes",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    feature: "Impact-Tracking / CO₂",
    desc: "CO₂ vermieden, Wiederverwendungsrate, Berichterstattung",
    bexio: "no",
    odoo: "no",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    feature: "KI-Eingabe",
    desc: "Natürlichsprachige Erfassung — «50 Laptops von UBS»",
    bexio: "no",
    odoo: "partial",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    feature: "Open Source",
    desc: "Quellcode öffentlich, MIT-lizenziert",
    bexio: "no",
    odoo: "yes",
    abacus: "no",
    kivitendo: "yes",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    feature: "Selbst-hostbar",
    desc: "Auf eigener Infrastruktur betreiben — keine Abhängigkeit",
    bexio: "no",
    odoo: "yes",
    abacus: "no",
    kivitendo: "yes",
    repairshopr: "no",
    kivvi: "yes",
  },
];

export const COMPETITORS = [
  {
    key: "bexio",
    name: "Bexio",
    note: "Schweizer KMU-Standard",
    verdict:
      "100 000+ Schweizer KMU, QR-Rechnungen, CAMT — buchhalterisch solide. Scheitert an der Grundannahme: Lager ist Menge, nicht Individuum. Keine Spenden, kein Zustand, kein Impact. Preiserhöhung März 2026 treibt Kunden zur Evaluation.",
  },
  {
    key: "odoo",
    name: "Odoo",
    note: "All-in-one Open-Source ERP",
    verdict:
      "Open Source, erweiterbar, Odoo 19 mit ernsthafter KI. Aber: CHF 5 000–30 000 für Schweizer Basissetup, dann Kreislauf-Workflows von null. Ein motivierter Partner könnte es bauen — dauert Jahre.",
  },
  {
    key: "abacus",
    name: "Abacus",
    note: "Schweizer Enterprise",
    verdict:
      "Buchhalterisch der Schweizer Standard für mittlere Unternehmen. Implementierungen ab CHF 20 000. Keine kreislaufspezifischen Funktionen — und kein Anreiz, sie für 20-Personen-Nonprofits zu bauen.",
  },
  {
    key: "kivitendo",
    name: "Kivitendo ★",
    note: "Open-Source-Vorgänger",
    verdict:
      "Hat Kivvi inspiriert. Ausgereifte Perl-Codebasis, QR-Rechnungen, KMU-Kontenrahmen. Kein Einzelartikel-Tracking, keine Zustandsbewertung, kein Impact-Dashboard, kein modernes UI. Kivvi importiert Kivitendo-Daten direkt per CSV.",
  },
  {
    key: "repairshopr",
    name: "RepairShopr / RepairDesk",
    note: "Reparatur-Ticketsysteme",
    verdict:
      "Ausgereifte Reparaturtickets, Kundennachrichten, Teileverfolgung. Kein vollständiges ERP: keine doppelte Buchführung, keine QR-Rechnungen, keine Bilanz. Buchhaltung muss separat gelöst werden.",
  },
  {
    key: "kivvi",
    name: "Kivvi",
    note: "Das fehlende Stück",
    verdict:
      "Verbindet alle Teile: Schweizer Compliance, Intake, Zustandsbewertung, Reparatur-Workflow, Buchhaltung, QR-Rechnungen, Spendenquittungen und Impact-Reporting — nativ für die Kreislaufwirtschaft.",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline / roadmap
// ─────────────────────────────────────────────────────────────────────────────

export type PipelineStatus = "live" | "building" | "planned" | "vision";

export interface PipelineItem {
  status: PipelineStatus;
  category: string;
  title: string;
  desc: string;
}

export const PIPELINE: PipelineItem[] = [
  // ── Live ──────────────────────────────────────────────────────────────────
  {
    status: "live",
    category: "Intake & Inventar",
    title: "Intake-Workflow mit Zustandsbewertung",
    desc: "Artikel erfassen, Zustand dokumentieren (Gut / Mittel / Schlecht / Teile / Schrott), Routing in Verkauf oder Reparatur.",
  },
  {
    status: "live",
    category: "Inventar",
    title: "Lagerverwaltung & Seriennummern",
    desc: "Mehrere Lager, Bestandsbewegungen, individuelle Seriennummernverfolgung pro Artikel.",
  },
  {
    status: "live",
    category: "Verkauf & Einkauf",
    title: "Alle Belegtypen — QR-Rechnung inklusive",
    desc: "Angebot → Auftrag → Lieferschein → Rechnung → Gutschrift. Gesetzeskonforme QR-Rechnungen, automatisch erstellt.",
  },
  {
    status: "live",
    category: "Buchhaltung",
    title: "Doppelte Buchführung (KMU Kontenrahmen)",
    desc: "227 Konten, automatische Journalbuchungen bei Rechnungen, Geschäftsjahre, Fiskalperioden.",
  },
  {
    status: "live",
    category: "Buchhaltung",
    title: "Berichte: GuV, Bilanz, MWST, Altersliste",
    desc: "Alle gesetzlich relevanten Berichte, in Echtzeit aus den Buchungen berechnet.",
  },
  {
    status: "live",
    category: "Banking",
    title: "Bankkonten & Transaktionsabgleich",
    desc: "Bankkonten verwalten, Kontoauszüge importieren (CSV), Transaktionen mit Rechnungen abgleichen.",
  },
  {
    status: "live",
    category: "Mahnwesen",
    title: "Automatisches Mahnwesen",
    desc: "Überfällige Rechnungen erkennen, Mahnstufen verwalten, Mahnbriefe erstellen.",
  },
  {
    status: "live",
    category: "KI",
    title: "KI-Befehlsleiste (Cmd+K)",
    desc: "Natürlichsprachige Erfassung: «50 Laptops von UBS gespendet» — Kivvi erledigt den Rest. Läuft auf Claude, GPT-4 oder lokal via Ollama.",
  },
  {
    status: "live",
    category: "Impact",
    title: "Impact-Dashboard & CO₂-Tracking",
    desc: "Wiederverwertungsrate, CO₂ vermieden (nach Kategorie), Artikel aus dem Kreislauf gerettet. Konfigurierbare CO₂-Faktoren pro Produktkategorie.",
  },
  {
    status: "live",
    category: "Migration",
    title: "Kivitendo-Migration per CSV",
    desc: "Kontakte, Produkte, Belege und Buchungen aus Kivitendo importieren — kein Engineering nötig.",
  },
  {
    status: "live",
    category: "Plattform",
    title: "Multi-Mandant & Self-Hosting",
    desc: "Strikte Datentrennung zwischen Mandanten. Auf eigener Infrastruktur betreibbar.",
  },
  {
    status: "live",
    category: "Plattform",
    title: "Open Source (MIT-Lizenz)",
    desc: "Vollständiger Quellcode öffentlich. Kein Vendor Lock-in, keine schwarzen Boxen.",
  },
  {
    status: "live",
    category: "Onboarding",
    title: "Vereinfachter Registrierungsflow",
    desc: "Konto erstellen in unter 60 Sekunden. Kein Formular-Overkill.",
  },
  {
    status: "live",
    category: "Impact",
    title: "Impact-Bericht als PDF",
    desc: "Einseitiger, teilbarer Jahresbericht für Vereinsberichte und Förderanträge.",
  },
  {
    status: "live",
    category: "Banking",
    title: "CAMT-Import (Schweizer Bankformat)",
    desc: "Kontoauszüge direkt im CAMT.053-Format — der Standard aller Schweizer Banken.",
  },
  // ── In Entwicklung ────────────────────────────────────────────────────────
  {
    status: "building",
    category: "Inventar",
    title: "Reparatur-Workflow",
    desc: "Reparaturaufträge mit Techniker-Zuweisung, Arbeitszeit und Statusverfolgung. Reparatur-Queue, Kostenerfassung, Protokoll und KI-Befehle (Kosten/Stunden, Zustand, Status, Datenlöschung, QC-Checkliste) bereits live — Teile-Tracking folgt.",
  },
  // ── Geplant ───────────────────────────────────────────────────────────────
  {
    status: "planned",
    category: "Community",
    title: "Kreislaufwirtschaft-Talentmarkt",
    desc: "Personen ohne eigene Organisation können nach Kreislaufbetrieben suchen und sich bewerben.",
  },
  {
    status: "planned",
    category: "Webshop",
    title: "Webshop-Integration",
    desc: "Artikel automatisch auf WooCommerce, Shopify oder eigenem Shop publizieren.",
  },
  {
    status: "planned",
    category: "Compliance",
    title: "Datenlöschzertifikate (nDSG)",
    desc: "Nachweisbare Datenlöschung nach NIST SP 800-88 / DIN 66399. Zertifikat pro Seriennummer.",
  },
  {
    status: "planned",
    category: "Mobile",
    title: "Mobile App / PWA",
    desc: "Intake, Barcode-Scanning und Lagerführung auf dem Tablet — offline-fähig.",
  },
  {
    status: "planned",
    category: "Impact",
    title: "Impact pro Kundin / Spender",
    desc: "Personalisierte Impact-Quittung: «Ihre Spende hat 316 kg CO₂ vermieden.»",
  },
  // ── Vision ────────────────────────────────────────────────────────────────
  {
    status: "vision",
    category: "Regulierung",
    title: "Digitaler Produktpass (EU ESPR ab 2028)",
    desc: "Reparatur- und Aufbereitungsereignisse maschinenlesbar protokollieren für den DPP.",
  },
  {
    status: "vision",
    category: "Plattform",
    title: "Öffentliches Organisationsverzeichnis",
    desc: "Alle Kivvi-Betriebe optional sichtbar: Was nehmen sie an? Wo kann man mithelfen?",
  },
  {
    status: "vision",
    category: "Daten",
    title: "Branchenweite Impact-Aggregation",
    desc: "Wie viel CO₂ hat die gesamte Kivvi-Community in diesem Jahr vermieden?",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Status display config
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  live: {
    label: "Live",
    icon: Check,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  },
  building: {
    label: "In Entwicklung",
    icon: Hammer,
    color: "text-info",
    bg: "bg-info/10",
    border: "border-info/20",
  },
  planned: {
    label: "Geplant",
    icon: Calendar,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
  },
  vision: {
    label: "Vision",
    icon: Lightbulb,
    color: "text-muted-foreground",
    bg: "bg-muted/60",
    border: "border-border",
  },
} as const;

export const STAGES = ["live", "building", "planned", "vision"] as const;

export const STAGE_HEADINGS: Record<
  (typeof STAGES)[number],
  { title: string; desc: string }
> = {
  live: {
    title: "Heute live",
    desc: "Funktionen, die du jetzt verwenden kannst.",
  },
  building: {
    title: "In Entwicklung",
    desc: "Was wir gerade bauen — kommt in den nächsten Wochen.",
  },
  planned: {
    title: "Geplant",
    desc: "Entschieden und auf dem Plan — Umsetzung folgt.",
  },
  vision: {
    title: "Grosse Vision",
    desc: "Wohin die Reise langfristig geht.",
  },
};
