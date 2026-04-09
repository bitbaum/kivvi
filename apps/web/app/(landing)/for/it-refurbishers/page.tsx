import Link from "next/link";
import { ArrowRight, Monitor } from "lucide-react";
import { SeeAlsoSection } from "@/components/landing/see-also-section";
import { PainList } from "@/components/landing/pain-list";
import { SolutionList } from "@/components/landing/solution-list";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kivvi für IT-Refurbisher & Computer-Recycler",
  description:
    "Einzelartikel-Tracking, Reparaturkosten pro Gerät, echte Marge — und CSV-Migration aus Kivitendo. Das ERP für IT-Refurbisher.",
};

const PAIN_ITEMS = [
  "Ihr heutiges System kann 'Zustand' nicht abbilden — gut/mittel/schlecht existiert nicht",
  "Reparaturkosten lassen sich nicht einem einzelnen Gerät zuordnen",
  "Marge pro Gerät ist eine Schätzung, keine Zahl",
  "Spendenquittungen werden manuell getippt",
  "Impact (CO₂, Geräte gerettet) lässt sich nicht messen oder belegen",
  "Migration aus Kivitendo blockiert — die Daten sitzen im alten System",
];

const SOLUTION_ITEMS = [
  "Jedes Gerät hat eine eindeutige ID, Seriennummer, Zustandsbewertung und vollständige Kostenhistorie",
  "Reparaturkosten werden pro Gerät geloggt: Datum, CHF, Stunden, Notiz",
  "Marge = Verkaufspreis − (Intake-Preis + alle Reparaturkosten) — sekundengenau",
  "Spendenquittungen bei Geräten-Eingang automatisch generiert",
  "Impact-Dashboard rechnet CO₂-Einsparung pro Gerätekategorie",
  "CSV-Import aus Kivitendo — Kontakte, Artikel, Rechnungen in einem Schritt",
];

export default function ForItRefurbishersPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Monitor className="h-4 w-4" />
          Für IT-Refurbisher & Computer-Recycler
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Das ERP, das Ihre Geräte kennt.
        </h1>
        <p className="text-xl text-muted-foreground">
          Nicht «100 ThinkPad T14 auf Lager» — sondern Laptop #47 mit
          Seriennummer XYZ, Batterie 78%, Reparaturkosten CHF 40, Marge CHF 12.
          Jedes Gerät. Jederzeit.
        </p>
      </section>

      {/* Pain section */}
      <section className="mx-auto max-w-3xl py-8">
        <h2 className="mb-6 text-2xl font-bold">Das kennen Sie?</h2>
        <PainList items={PAIN_ITEMS} />
      </section>

      {/* Solution section */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-6 text-2xl font-bold">Kivvi löst das</h2>
        <SolutionList items={SOLUTION_ITEMS} />
      </section>

      {/* Migration section */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-3 text-xl font-bold">Von Kivitendo zu Kivvi</h2>
          <p className="mb-6 text-muted-foreground">
            Kivvi war als direkter Nachfolger von Kivitendo für
            Secondhand-Betriebe konzipiert. Die Migration ist Self-Service: CSV
            exportieren, hochladen, fertig.
          </p>
          <div className="space-y-3">
            {[
              "Kontakte (Kunden & Lieferanten) importieren",
              "Artikel & Produktgruppen importieren",
              "Angebote, Aufträge, Rechnungen importieren",
              "Nummernkreise übernehmen — keine Lücken",
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Migrations-Guide lesen <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section className="mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border bg-primary/5 p-8">
          <p className="text-sm font-medium uppercase tracking-wider text-primary mb-2">
            Bewährt im Betrieb
          </p>
          <h2 className="mb-3 text-xl font-bold">
            Gebaut von revamp-it — einem der grössten IT-Refurbisher der Schweiz
          </h2>
          <p className="text-muted-foreground mb-4">
            Seit 2003 nimmt revamp-it Elektronik an, testet, repariert und
            verkauft weiter. Kivvi wurde aus echten Betriebsproblemen heraus
            entwickelt — nicht als Software-Projekt, das zufällig im Secondhand
            landet.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">23+</div>
              <div className="text-xs text-muted-foreground">
                Jahre Erfahrung
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">5&apos;000+</div>
              <div className="text-xs text-muted-foreground">
                Geräte verwaltet
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">MIT</div>
              <div className="text-xs text-muted-foreground">Open Source</div>
            </div>
          </div>
        </div>
      </section>

      <SeeAlsoSection current="it-refurbishers" />

      <LandingCtaSection
        title="Demo für IT-Refurbisher"
        description="Zeigen Sie uns Ihren heutigen Ablauf — wir zeigen Ihnen, wie Kivvi ihn abbildet."
      />
    </>
  );
}
