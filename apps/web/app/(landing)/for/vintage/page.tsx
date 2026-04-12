import { Shirt } from "lucide-react";
import { SeeAlsoSection } from "@/components/landing/see-also-section";
import { PainList } from "@/components/landing/pain-list";
import { SolutionList } from "@/components/landing/solution-list";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { CONDITION_GRADES } from "@/lib/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kivvi für Vintage-Shops & Kleiderbörsen",
  description:
    "Einzelartikel-Tracking, Kommissions-Abrechnung, Zustandsbewertung für Kleidung — ohne Excel.",
};

const PAIN_ITEMS = [
  "Kein Zustandssystem für Kleidung — gut/mittel/schlecht existiert in Standard-Software nicht",
  "Kommissionsverkauf nicht abbildbar: Wer hat was eingeliefert, was steht noch aus?",
  "Preise sind pro Stück, aber Systeme denken in Einheitspreis-pro-SKU",
  "Herkunft (Marke, Dekade, Besonderheit) ist nirgends sauber erfassbar",
  "Umsatz pro Einlieferer ist manuell — Excel oder Notizbuch",
  "Impact-Zahlen für Kommunikation fehlen: Wie viel Kleidung vor dem Müll gerettet?",
];

// Clothing-specific criteria — index-aligned with CONDITION_GRADES
const CLOTHING_CRITERIA = [
  "Wie neu, keine sichtbaren Gebrauchsspuren, keine Beschädigungen",
  "Leichte Gebrauchsspuren, minimale Pilling, kaum sichtbar",
  "Deutliche Gebrauchsspuren, Pilling, Verfärbungen — noch tragbar",
  "Beschädigungen (Riss, Loch, Fleck) — für Upcycling oder Reparatur",
  "Nicht verkäuflich, Recycling oder Entsorgung",
];

// Text colors matching CONDITION_GRADES order (green/blue/amber/orange/red)
const CLOTHING_TEXT_COLORS = [
  "text-green-700 dark:text-green-400",
  "text-blue-700 dark:text-blue-400",
  "text-amber-700 dark:text-amber-400",
  "text-orange-700 dark:text-orange-400",
  "text-red-700 dark:text-red-400",
];

const SOLUTION_ITEMS = [
  "Jedes Stück bekommt eine ID, Zustand (Gut/Mittel/Schlecht), Kategorie und Preis",
  "Kommissionsquelle wird beim Intake erfasst — Einlieferer-Abrechnung automatisch",
  "Freie Spezifikationsfelder: Marke, Dekade, Material, Besonderheiten",
  "QR-Etikett per Stück — scannen am Verkaufstisch öffnet sofort das Stück",
  "Umsatz pro Einlieferer: wer, was, wann, wie viel — auf Knopfdruck",
  "Impact-Dashboard: Kilogramm Kleidung gerettet, Stücke verkauft, CO₂ vermieden",
];

export default function ForVintageShopsPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Shirt className="h-4 w-4" />
          Für Vintage-Shops & Kleiderbörsen
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Jedes Stück hat seinen Wert.
        </h1>
        <p className="text-xl text-muted-foreground">
          Vintage ist Kuration. Jedes Stück ist einzigartig — mit eigenem
          Zustand, eigener Geschichte, eigenem Preis. Kivvi denkt wie Ihr
          Betrieb.
        </p>
      </section>

      {/* What makes vintage different */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-3 text-xl font-bold">
            Vintage ist nicht Second-Hand-Massenware
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Standard-Lagersysteme denken in SKUs: «50 Jeans, Grösse 32». Das
            stimmt für Fast-Fashion-Retour — aber nicht für Vintage. Kein
            Vintage-Stück ist identisch mit einem anderen. Preis, Zustand und
            Geschichte sind individuell.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Dazu kommen oft Kommissionsmodelle: Einlieferer bringen Stücke, der
            Shop verkauft und behält eine Provision. Das erfordert sauberes
            Tracking — wer hat was eingeliefert, was wurde verkauft, was
            schulden wir noch?
          </p>
        </div>
      </section>

      {/* Pain section */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-6 text-2xl font-bold">
          Was im Vintage-Betrieb fehlt
        </h2>
        <PainList items={PAIN_ITEMS} />
      </section>

      {/* Solution section */}
      <section className="mx-auto max-w-3xl py-8">
        <h2 className="mb-6 text-2xl font-bold">Kivvi für Vintage-Shops</h2>
        <SolutionList items={SOLUTION_ITEMS} />
      </section>

      {/* Condition guide for clothing */}
      <section className="mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-4 text-xl font-bold">
            Zustandsbewertung für Kleidung
          </h2>
          <p className="text-muted-foreground mb-6">
            Konsistente Bewertungen schaffen Kundenvertrauen. Kivvi verwendet
            die gleichen 5 Stufen wie für IT und andere Warengruppen — angepasst
            auf Ihre Kriterien:
          </p>
          <div className="space-y-3">
            {CONDITION_GRADES.map((grade, i) => (
              <div key={grade.label} className="flex items-start gap-3">
                <span
                  className={`shrink-0 w-20 text-sm font-semibold ${CLOTHING_TEXT_COLORS[i]}`}
                >
                  {grade.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {CLOTHING_CRITERIA[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SeeAlsoSection current="vintage" />

      <LandingCtaSection
        title="Demo für Vintage-Shops"
        description="Zeigen Sie uns Ihren Betrieb — wir zeigen Ihnen, wie Kivvi ihn abbildet."
      />
    </>
  );
}
