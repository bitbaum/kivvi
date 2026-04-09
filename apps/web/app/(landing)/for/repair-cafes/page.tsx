import { Wrench } from "lucide-react";
import { SeeAlsoSection } from "@/components/landing/see-also-section";
import { PainList } from "@/components/landing/pain-list";
import { SolutionList } from "@/components/landing/solution-list";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kivvi für Repair Cafés & Werkstätten",
  description:
    "Reparaturprotokoll pro Gerät, Stunden-Tracking, Impact-Nachweis für Förderanträge — für Repair Cafés und Werkstätten.",
};

const PAIN_ITEMS = [
  "Keine strukturierte Auftragserfassung — was wurde heute repariert und von wem?",
  "Reparaturhistorie pro Gerät existiert nicht — bei Folgereparaturen fehlt der Kontext",
  "Freiwilligenstunden werden nicht oder manuell erfasst",
  "Impact-Zahlen für Förderanträge müssen mühsam zusammengerechnet werden",
  "Ob eine Reparatur wirtschaftlich sinnvoll war, lässt sich nicht auswerten",
  "Keine QR-Rechnungen, obwohl gesetzlich erforderlich bei professionellem Betrieb",
];

const SOLUTION_ITEMS = [
  "Reparaturprotokoll pro Gerät: Datum, Symptom, Lösung, Teile, Dauer — strukturiert erfasst",
  "Gerätehistorie: Bei Wiedervorlage sieht man sofort alle früheren Reparaturen",
  "Stunden-Tracking pro Auftrag — für Freiwillige und bezahltes Personal",
  "Impact-Dashboard: Geräte gerettet, CO₂ vermieden, Stunden geleistet — auf Knopfdruck",
  "Kostentransparenz: Was hat die Reparatur effektiv gekostet vs. was wurde bezahlt?",
  "QR-Rechnungen für kostenpflichtige Reparaturen — gesetzeskonform, automatisch",
];

export default function ForRepairCafesPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Wrench className="h-4 w-4" />
          Für Repair Cafés & Werkstätten
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Reparatur endlich dokumentiert.
        </h1>
        <p className="text-xl text-muted-foreground">
          Was repariert? Von wem? Wie lange? Welche Teile? Was kostet es? Und
          wie viel CO₂ wurde vermieden? Kivvi beantwortet all das — ohne Excel.
        </p>
      </section>

      {/* The repair movement */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-3 text-xl font-bold">
            Repair Cafés sind mehr als Reparatur
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Repair Cafés und Werkstätten sind Orte, wo Menschen zusammenkommen,
            um defekte Gegenstände zu reparieren — statt wegzuwerfen. Das ist
            eine kulturelle Bewegung, nicht nur ein Dienstleistungsangebot.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Gleichzeitig brauchen diese Betriebe zunehmend nachweisbare Zahlen:
            Wie viele Geräte gerettet? Wie viel Elektroschrott vermieden? Diese
            Daten entscheiden über Fördergelder, Partnerschaften und öffentliche
            Wahrnehmung.
          </p>
        </div>
      </section>

      {/* Pain section */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-6 text-2xl font-bold">Was heute fehlt</h2>
        <PainList items={PAIN_ITEMS} />
      </section>

      {/* Solution section */}
      <section className="mx-auto max-w-3xl py-8">
        <h2 className="mb-6 text-2xl font-bold">Was Kivvi bringt</h2>
        <SolutionList items={SOLUTION_ITEMS} />
      </section>

      {/* Repair business model */}
      <section className="mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-4 text-xl font-bold">
            Das Geschäftsmodell «Reparatur-als-Service»
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Repair Cafés und Werkstätten arbeiten nach einem anderen Modell als
            klassische Läden: Das Eigentum am Gerät bleibt beim Kunden. Der
            Betrieb verkauft Zeit und Ersatzteile — nicht Güter.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm font-semibold mb-1">Auftrag</div>
              <div className="text-xs text-muted-foreground">
                Kundenproblem wird erfasst, Gerät identifiziert, Reparatur
                gestartet
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-semibold mb-1">Protokoll</div>
              <div className="text-xs text-muted-foreground">
                Diagnose, verwendete Teile, geleistete Stunden werden
                dokumentiert
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-semibold mb-1">Abschluss</div>
              <div className="text-xs text-muted-foreground">
                QR-Rechnung oder Bestätigung (bei ehrenamtlicher Reparatur),
                Impact erfasst
              </div>
            </div>
          </div>
        </div>
      </section>

      <SeeAlsoSection current="repair-cafes" />

      <LandingCtaSection
        title="Demo für Repair Cafés"
        description="Kostenlos und unverbindlich — wir zeigen Ihnen, wie Kivvi Ihren Reparaturbetrieb digital macht."
      />
    </>
  );
}
