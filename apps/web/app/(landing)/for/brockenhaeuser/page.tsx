import { ShoppingBag } from "lucide-react";
import { SeeAlsoSection } from "@/components/landing/see-also-section";
import { PainList } from "@/components/landing/pain-list";
import { SolutionList } from "@/components/landing/solution-list";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { buildPageMeta } from "@/lib/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kivvi für Brockenhäuser & Sozialkaufhäuser",
  description:
    "Spendenquittungen auf Knopfdruck, Donormanagement, Impact-Nachweis für Förderanträge — CHF 0 Lizenzkosten.",
  ...buildPageMeta(
    "Kivvi für Brockenhäuser & Sozialkaufhäuser",
    "Spendenquittungen auf Knopfdruck, Donormanagement, Impact-Nachweis für Förderanträge — CHF 0 Lizenzkosten.",
  ),
};

const PAIN_ITEMS = [
  "Spendenquittungen werden manuell in Word getippt — pro Spender, pro Abgabe",
  "Wer hat was gespendet? Die Antwort liegt in einem Notizbuch oder gar nicht",
  "Für Förderanträge muss Impact mühsam zusammengerechnet werden",
  "Ware kommt rein ohne strukturierte Erfassung — man weiss nicht, was man hat",
  "QR-Rechnungen für Verkäufe? Gesetzlich nötig, aber zu aufwändig ohne System",
  "Am Quartalsende: Excel-Tabellen mit der Hand addieren",
];

const SOLUTION_ITEMS = [
  "Spendenquittung sofort bei Wareneingang generieren — konforme Vorlage, druckbereit",
  "Jeder Donor im System: Kontaktdaten, Spendenhistorie und individueller CO₂-Impact auf der Kontaktseite",
  "Impact-Dashboard: Anzahl Artikel, geschätzter Wert, CO₂-Einsparung — auf Knopfdruck",
  "Wareneingang per KI-Schnelleingabe: «20 Winterjacken, 5 Fahrräder» → erfasst",
  "QR-Rechnungen automatisch für jeden Verkauf — gesetzlich korrekt, null Aufwand",
  "Monatsabschluss: Dashboard zeigt Umsatz, Wareneingang, Impact — ohne Excel",
];

export default function ForBrockenhaeuserPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <ShoppingBag className="h-4 w-4" />
          Für Brockenhäuser & Sozialkaufhäuser
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Weniger Papier. Mehr Wirkung.
        </h1>
        <p className="text-xl text-muted-foreground">
          Spendenquittungen auf Knopfdruck, Donorenverwaltung, Impact-Nachweis
          für Förderanträge — und trotzdem einfach genug für Freiwillige.
        </p>
      </section>

      {/* Pain section */}
      <section className="mx-auto max-w-3xl py-8">
        <h2 className="mb-6 text-2xl font-bold">Was heute zu lange dauert</h2>
        <PainList items={PAIN_ITEMS} />
      </section>

      {/* Solution section */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-6 text-2xl font-bold">Wie Kivvi hilft</h2>
        <SolutionList items={SOLUTION_ITEMS} />
      </section>

      {/* Social economy context */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-3 text-xl font-bold">
            Gemacht für die Soziale Wirtschaft
          </h2>
          <p className="mb-4 text-muted-foreground">
            Brockenhäuser arbeiten oft mit Freiwilligen, haben knappe IT-Budgets
            und müssen Transparenz gegenüber Förderern nachweisen. Kivvi ist
            darauf ausgelegt:
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <div className="text-xl font-bold text-primary">CHF 0</div>
              <div className="text-sm text-muted-foreground mt-1">
                Lizenzkosten (Open Source)
              </div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-xl font-bold text-primary">5 min</div>
              <div className="text-sm text-muted-foreground mt-1">
                Einarbeitung für Freiwillige
              </div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground mt-1">
                Daten in Ihrer Hand
              </div>
            </div>
          </div>
        </div>
      </section>

      <SeeAlsoSection current="brockenhaeuser" />

      <LandingCtaSection
        title="Demo für Brockenhäuser"
        description="Wir zeigen Ihnen, wie Kivvi in Ihrer Brockenstube funktioniert — kostenlos und unverbindlich."
      />
    </>
  );
}
