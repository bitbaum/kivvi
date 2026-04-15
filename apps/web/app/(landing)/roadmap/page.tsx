import Link from "next/link";
import {
  Check,
  Hammer,
  Calendar,
  Lightbulb,
  Heart,
  ArrowRight,
  ExternalLink,
  X,
  Minus,
} from "lucide-react";
import type { Metadata } from "next";
import { buildPageMeta } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Roadmap & Vergleich — Kivvi",
  description:
    "Warum bestehende ERPs für die Kreislaufwirtschaft scheitern, was Kivvi heute kann, und was als Nächstes kommt.",
  ...buildPageMeta(
    "Roadmap & Vergleich — Kivvi",
    "Warum bestehende ERPs für die Kreislaufwirtschaft scheitern, was Kivvi heute kann, und was als Nächstes kommt.",
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Competitor comparison data
// ─────────────────────────────────────────────────────────────────────────────

type Support = "yes" | "partial" | "no";

interface CompetitorFeature {
  feature: string;
  desc: string;
  bexio: Support;
  odoo: Support;
  abacus: Support;
  kivitendo: Support;
  repairshopr: Support;
  kivvi: Support;
}

const COMPARISON: CompetitorFeature[] = [
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

const COMPETITORS = [
  {
    key: "bexio",
    name: "Bexio",
    note: "Schweizer KMU-Standard",
    verdict: "Solide Buchhaltung, aber kein Artikelgedächtnis. Fungible Mengen statt Einzelobjekte.",
  },
  {
    key: "odoo",
    name: "Odoo",
    note: "All-in-one ERP",
    verdict: "Reparaturmodul vorhanden, aber CHF 50–150k Customizing nötig. Kein Kreislauf-Workflow out of the box.",
  },
  {
    key: "abacus",
    name: "Abacus",
    note: "Schweizer Enterprise",
    verdict: "Buchhalterisch exzellent, teuer, keine kreislaufspezifischen Funktionen.",
  },
  {
    key: "kivitendo",
    name: "Kivitendo ★",
    note: "Open-Source-Inspiration",
    verdict: "Hat Kivvi inspiriert. Ausgereifte Buchführung, Schweizer QR-Rechnung — aber kein Einzelartikel-Tracking, keine Zustandsbewertung, kein Impact.",
  },
  {
    key: "repairshopr",
    name: "RepairShopr",
    note: "Reparatur-Tool",
    verdict: "Gut für Reparaturtickets. Kein vollständiges ERP — keine doppelte Buchführung, keine QR-Rechnungen, keine Bilanz.",
  },
  {
    key: "kivvi",
    name: "Kivvi",
    note: "Das fehlende Stück",
    verdict: "Verbindet alle Teile: Intake, Zustand, Reparatur, Buchhaltung, QR-Rechnungen, Impact — nativ für die Kreislaufwirtschaft.",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline data
// ─────────────────────────────────────────────────────────────────────────────

const PIPELINE: {
  status: "live" | "building" | "planned" | "vision";
  category: string;
  title: string;
  desc: string;
}[] = [
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

  // ── In Entwicklung ────────────────────────────────────────────────────────
  {
    status: "building",
    category: "Onboarding",
    title: "Vereinfachter Registrierungsflow",
    desc: "Konto erstellen in unter 60 Sekunden. Kein Formular-Overkill.",
  },
  {
    status: "building",
    category: "Impact",
    title: "Impact-Bericht als PDF",
    desc: "Einseitiger, teilbarer Jahresbericht für Vereinsberichte und Förderanträge.",
  },
  {
    status: "building",
    category: "Banking",
    title: "CAMT-Import (Schweizer Bankformat)",
    desc: "Kontoauszüge direkt im CAMT.053-Format — der Standard aller Schweizer Banken.",
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
    category: "Inventar",
    title: "Reparatur-Workflow",
    desc: "Reparaturaufträge mit Techniker-Zuweisung, Teile-Tracking, Arbeitszeit und Statusverfolgung.",
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

const STATUS_CONFIG = {
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

const STAGES = ["live", "building", "planned", "vision"] as const;

const STAGE_HEADINGS: Record<(typeof STAGES)[number], { title: string; desc: string }> = {
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

// ─────────────────────────────────────────────────────────────────────────────

function SupportIcon({ value }: { value: Support }) {
  if (value === "yes")
    return <Check className="mx-auto h-4 w-4 text-success" />;
  if (value === "partial")
    return <Minus className="mx-auto h-4 w-4 text-warning" />;
  return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
}

export default function RoadmapPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 space-y-20">

      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Roadmap & Vergleich</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Warum bestehende ERPs für die Kreislaufwirtschaft scheitern, was Kivvi heute kann,
          und was als Nächstes kommt.
        </p>
      </div>

      {/* ── Competitor comparison ────────────────────────────────────────────── */}
      <section id="vergleich" className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">Das Software-Problem der Kreislaufwirtschaft</h2>
          <p className="mt-2 text-muted-foreground">
            Kein bestehendes ERP verbindet alle Teile — jedes scheitert aus strukturellen Gründen.
            Kivvi wurde gebaut, weil die Lücke zu gross und zu teuer war, um sie mit Workarounds zu schliessen.
          </p>
        </div>

        {/* Competitor verdicts */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMPETITORS.map((c) => (
            <div
              key={c.key}
              className={`rounded-xl border p-5 space-y-2 ${
                c.key === "kivvi"
                  ? "border-success/30 bg-success/5"
                  : c.key === "kivitendo"
                  ? "border-info/30 bg-info/5"
                  : "bg-card"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{c.note}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.verdict}</p>
            </div>
          ))}
        </div>

        {/* Feature matrix — horizontal scroll on mobile */}
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[220px]">
                  Funktion
                </th>
                {COMPETITORS.map((c) => (
                  <th
                    key={c.key}
                    className={`px-3 py-3 text-center font-medium w-20 ${
                      c.key === "kivvi" ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {c.name.replace(" ★", "")}
                    {c.key === "kivitendo" && (
                      <span className="ml-1 text-info">★</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium leading-snug">{row.feature}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{row.desc}</div>
                  </td>
                  {COMPETITORS.map((c) => (
                    <td key={c.key} className="px-3 py-3 text-center">
                      <SupportIcon value={row[c.key as keyof typeof row] as Support} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" /> Nativ unterstützt
          </span>
          <span className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-warning" /> Möglich mit Aufwand / partiell
          </span>
          <span className="flex items-center gap-2">
            <X className="h-4 w-4 text-muted-foreground/40" /> Nicht vorhanden
          </span>
          <span className="ml-auto text-xs">
            ★ Kivitendo hat Kivvi inspiriert
          </span>
        </div>

        <div className="text-sm">
          <Link
            href="/knowledge/kreislaufwirtschaft-software-problem"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            Vollständige Analyse lesen
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Donate CTA ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <Heart className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Entwicklung unterstützen</h2>
        <p className="mx-auto max-w-lg text-muted-foreground">
          Kivvi ist Open Source und wird von revamp-it, einem gemeinnützigen IT-Refurbisher aus Zürich,
          entwickelt. Jede Spende fliesst direkt in neue Funktionen und den Betrieb der Plattform.
        </p>
        <a
          href="https://revamp-it.ch"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
        >
          <Heart className="h-4 w-4" />
          Jetzt spenden
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>
        <p className="text-xs text-muted-foreground">
          Weiterleitung zu revamp-it Zürich · gemeinnützig nach Art. 56 lit. g DBG
        </p>
      </div>

      {/* ── Pipeline ────────────────────────────────────────────────────────── */}
      <section id="pipeline" className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Was wir bauen</h2>
          <p className="mt-2 text-muted-foreground">
            Wir bauen Kivvi öffentlich — keine Überraschungen.
          </p>
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap gap-3">
          {STAGES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <span
                key={s}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}
              >
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
            );
          })}
        </div>
      </section>

      {/* Pipeline stages */}
      {STAGES.map((stage) => {
        const items = PIPELINE.filter((p) => p.status === stage);
        if (items.length === 0) return null;
        const cfg = STATUS_CONFIG[stage];
        const Icon = cfg.icon;
        const heading = STAGE_HEADINGS[stage];

        return (
          <section key={stage} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${cfg.bg}`}>
                <Icon className={`h-5 w-5 ${cfg.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{heading.title}</h3>
                <p className="text-sm text-muted-foreground">{heading.desc}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-xl border ${cfg.border} bg-card p-5 space-y-2`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm leading-snug">{item.title}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Footer links */}
      <div className="text-center space-y-3 text-sm text-muted-foreground border-t pt-10">
        <p>
          Kivvi ist MIT-lizenziert und auf GitHub öffentlich.{" "}
          <a
            href="https://github.com/g-but/kivvi"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            Mitwirken willkommen.
          </a>
        </p>
        <p>
          Fehlt dir etwas auf dieser Liste?{" "}
          <Link href="/contact" className="font-medium text-foreground hover:underline">
            Schreib uns.
          </Link>
        </p>
      </div>
    </div>
  );
}
