import { PackageOpen, Wrench, ShoppingCart } from "lucide-react";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { CONDITION_GRADES, buildPageMeta } from "@/lib/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wie Kivvi funktioniert — Drei Phasen, ein System",
  description:
    "Wareneingang, Bewertung & Reparatur, Verkauf & Impact — Kivvi begleitet jeden Artikel von der Spende bis zum Verkauf. Einzelartikel-Tracking für Kreislaufbetriebe.",
  ...buildPageMeta(
    "Wie Kivvi funktioniert — Drei Phasen, ein System",
    "Wareneingang, Bewertung & Reparatur, Verkauf & Impact — Kivvi begleitet jeden Artikel von der Spende bis zum Verkauf. Einzelartikel-Tracking für Kreislaufbetriebe.",
  ),
};

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
          Wie Kivvi funktioniert
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Drei Phasen. Ein System.
        </h1>
        <p className="text-xl text-muted-foreground">
          Von der Warenannahme bis zum Verkaufsabschluss — jeder Schritt digital
          erfasst, jeder Artikel mit vollständiger Geschichte.
        </p>
      </section>

      {/* Why individual tracking */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-warning/5 p-8">
          <h2 className="mb-3 text-xl font-bold">
            Der Kern: Einzelartikel statt Lagerbestand
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Standard-ERPs verwalten Stückzahlen: «100 ThinkPad T14 auf Lager».
            Kreislaufbetriebe verwalten Individuen: «Laptop #23 — Batterie: 78%,
            Kratzer am Gehäuse, Reparaturkosten CHF 40, Verkaufspreis CHF 80,
            Marge CHF 12». Nur wenn jedes Gerät seine eigene Geschichte hat,
            kann man echte Margen berechnen, Qualität garantieren und Kunden
            beraten.
          </p>
        </div>
      </section>

      {/* Phase 1 */}
      <section className="mx-auto max-w-4xl py-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-info/10">
            <PackageOpen className="h-6 w-6 text-info" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-info">
              Phase 1
            </p>
            <h2 className="text-2xl font-bold">Wareneingang</h2>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FeatureCard
            title="Alle Quellen — eine Maske"
            description="Spende, Einkauf, Rücknahme oder Kommission: Kivvi kennt den Unterschied und protokolliert ihn korrekt. Spendenquittung bei Spende, Lieferantenrechnung bei Einkauf — automatisch."
          />
          <FeatureCard
            title="KI-Schnelleingabe"
            description="«50 Lenovo ThinkPad T14, Akkus schwach» → Enter. Die KI erkennt Marke, Modell und Menge. 50 Artikel erfasst, QR-Etiketten druckbereit, in Sekunden."
          />
          <FeatureCard
            title="QR-Etiketten"
            description="Jeder Artikel bekommt eine eindeutige Nummer und einen QR-Code. Scannen am Verkaufstisch öffnet sofort den vollständigen Artikel-Datensatz."
          />
          <FeatureCard
            title="Spendenquittungen"
            description="Konforme Spendenquittungen nach Schweizer Recht — automatisch generiert, direkt druckbar. Kein manuelles Ausfüllen mehr."
          />
        </div>
      </section>

      {/* Phase 2 */}
      <section className="mx-auto max-w-4xl py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <Wrench className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-warning">
              Phase 2
            </p>
            <h2 className="text-2xl font-bold">Bewertung & Reparatur</h2>
          </div>
        </div>

        <div className="mb-8 rounded-xl border p-6">
          <h3 className="mb-4 font-semibold">Die 5 Zustandsstufen</h3>
          <div className="grid gap-3 sm:grid-cols-5">
            {CONDITION_GRADES.map((s) => (
              <div
                key={s.label}
                className={`rounded-lg p-3 text-center ${s.colorClass}`}
              >
                <div className="font-semibold text-sm">{s.label}</div>
                <div className="mt-1 text-xs opacity-75">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FeatureCard
            title="Reparaturprotokoll"
            description="Kosten, Stunden, Notizen — pro Reparaturschritt. Das Protokoll akkumuliert über alle Einträge. Entstehungskosten sind jederzeit transparent."
          />
          <FeatureCard
            title="Echte Margenkalkulation"
            description="Einkaufspreis + alle Reparaturkosten = Kostenbasis. Richtpreis und Mindestpreis werden dagegen gerechnet. Keine Schätzungen, echte Zahlen."
          />
        </div>
      </section>

      {/* Phase 3 */}
      <section className="mx-auto max-w-4xl py-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/10">
            <ShoppingCart className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-success">
              Phase 3
            </p>
            <h2 className="text-2xl font-bold">Verkauf & Impact</h2>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FeatureCard
            title="Flexible Preisgestaltung"
            description="Richtpreis, Mindestpreis, Sonderpreis — alles am Artikel hinterlegt. Budgetbasierter Verkauf geht per Scan und manuellem Preisanpassen, protokolliert mit Begründung."
          />
          <FeatureCard
            title="QR-Rechnung (gesetzlich)"
            description="Jede Rechnung generiert automatisch einen gültigen Schweizer QR-Zahlschein — seit 2022 gesetzlich vorgeschrieben. MWST und Rappen-Rundung korrekt gerechnet."
          />
          <FeatureCard
            title="Impact-Dashboard"
            description="Wie viele Geräte gerettet? Wie viel CO₂ vermieden? Wie viele Menschen bedient? Das Dashboard rechnet Impact aus definierten Werten pro Artikelkategorie."
          />
          <FeatureCard
            title="Vollständiger Lebenslauf"
            description="Jeder Artikel hat einen Lebenslauf: Intake-Datum, Spender, Zustand, alle Reparaturen, Verkaufsdatum, Endpreis. Lückenlos, manipulationssicher."
          />
        </div>
      </section>

      <LandingCtaSection
        title="Bereit für Ihren Betrieb?"
        description="Schreiben Sie uns oder registrieren Sie sich direkt — die erste Demo ist kostenlos."
      />
    </>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
