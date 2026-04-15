import Link from "next/link";
import { Check, Hammer, Calendar, Lightbulb, Heart, ArrowRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { buildPageMeta } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Roadmap — Kivvi",
  description:
    "Was wir gebaut haben, was wir gerade entwickeln, und wohin die Reise geht. Transparenz ist uns wichtig.",
  ...buildPageMeta(
    "Roadmap — Kivvi",
    "Was wir gebaut haben, was wir gerade entwickeln, und wohin die Reise geht.",
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline data — single source of truth for this page
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
    desc: "Kontakte, Produkte, Belege und Buchungen aus Kivitendo importieren — kein Engineering nötig, selbstständig in Minuten.",
  },
  {
    status: "live",
    category: "Plattform",
    title: "Multi-Mandant & Self-Hosting",
    desc: "Strikte Datentrennung zwischen Mandanten. Auf eigener Infrastruktur betreibbar — keine Abhängigkeit von Kivvi-Servern.",
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
    desc: "Konto erstellen in unter 60 Sekunden. Kein /join-Umweg, kein Formular-Overkill.",
  },
  {
    status: "building",
    category: "Impact",
    title: "Impact-Bericht als PDF",
    desc: "Einseitiger, teilbarer Jahresbericht: Artikel gerettet, CO₂ vermieden, Wert geschaffen — für Vereinsberichte und Förderanträge.",
  },
  {
    status: "building",
    category: "Banking",
    title: "CAMT-Import (Schweizer Bankformat)",
    desc: "Kontoauszüge direkt im CAMT.053-Format importieren — der Standard aller Schweizer Banken.",
  },

  // ── Geplant ───────────────────────────────────────────────────────────────
  {
    status: "planned",
    category: "Community",
    title: "Kreislaufwirtschaft-Talentmarkt",
    desc: "Personen ohne eigene Organisation können nach Kreislaufbetrieben suchen und sich bewerben — Kivvi als Verbindungsschicht zwischen Menschen und Organisationen.",
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
    desc: "Artikel automatisch auf WooCommerce, Shopify oder eigenem Shop publizieren. Bestand bidirektional synchronisieren.",
  },
  {
    status: "planned",
    category: "Compliance",
    title: "Datenlöschzertifikate (nDSG)",
    desc: "Nachweisbare Datenlöschung nach NIST SP 800-88 / DIN 66399 für gespendete Geräte. Zertifikat pro Seriennummer.",
  },
  {
    status: "planned",
    category: "Mobile",
    title: "Mobile App / PWA",
    desc: "Intake, Barcode-Scanning und Lagerführung auf dem Tablet — offline-fähig für den Lagerbetrieb.",
  },
  {
    status: "planned",
    category: "Impact",
    title: "Impact pro Kundin / Spender",
    desc: "Wie viel CO₂ hat dieser Spender durch seine Donation vermieden? Personalisierte Impact-Quittung.",
  },

  // ── Vision ────────────────────────────────────────────────────────────────
  {
    status: "vision",
    category: "Regulierung",
    title: "Digitaler Produktpass (EU ESPR ab 2028)",
    desc: "Reparatur- und Aufbereitungsereignisse maschinenlesbar protokollieren — Grundlage für den DPP, der ab 2028 für Elektronik Pflicht wird.",
  },
  {
    status: "vision",
    category: "Plattform",
    title: "Öffentliches Organisationsverzeichnis",
    desc: "Alle Kivvi-Betriebe optional sichtbar: Was nehmen sie an? Was verkaufen sie? Wo kann man mithelfen?",
  },
  {
    status: "vision",
    category: "Daten",
    title: "Branchenweite Impact-Aggregation",
    desc: "Anonymisierte Gesamtstatistiken: Wie viel CO₂ hat die gesamte Kivvi-Community in diesem Jahr vermieden?",
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

export default function RoadmapPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 space-y-16">

      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Roadmap</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Was wir gebaut haben, was wir gerade entwickeln, und wohin die Reise geht.
          Wir bauen Kivvi öffentlich — keine Überraschungen.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
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
      </div>

      {/* Donate CTA */}
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
          href="https://revampit.vercel.app"
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
                <h2 className="text-xl font-semibold">{heading.title}</h2>
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

      {/* Competitor context */}
      <div className="rounded-xl border bg-muted/30 p-8 space-y-4">
        <h2 className="text-lg font-semibold">Warum ein neues ERP?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Bexio, Odoo, SAP, Abacus und Kivitendo lösen das Problem nicht — jedes aus strukturellen
          Gründen. Bexio kennt kein Einzelartikel-Tracking. Odoo braucht CHF 50–150k Customizing.
          Reparatur-Tools wie RepairShopr sind keine ERPs. Niemand hat die Teile verbunden.
        </p>
        <Link
          href="/knowledge/kreislaufwirtschaft-software-problem"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Vollständige Analyse: Die Kreislaufwirtschaft hat ein Software-Problem
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Open source note */}
      <div className="text-center space-y-3 text-sm text-muted-foreground">
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
