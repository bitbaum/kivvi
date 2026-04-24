import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { buildPageMeta } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Warum Kivvi — ERP für Kreislaufbetriebe",
  description:
    "8 Dimensionen, in denen Standard-ERPs für Kreislaufbetriebe strukturell scheitern — und wie Kivvi als Betriebssystem für die Kreislaufwirtschaft antwortet.",
  ...buildPageMeta(
    "Warum Kivvi — ERP für Kreislaufbetriebe",
    "8 Dimensionen, in denen Standard-ERPs für Kreislaufbetriebe strukturell scheitern — und wie Kivvi als Betriebssystem für die Kreislaufwirtschaft antwortet.",
  ),
};

const DIMENSIONS = [
  {
    title: "Artikelverfolgung",
    erpAssumption:
      "Lager besteht aus SKUs und Mengen. «100 ThinkPad T14» ist vollständig beschrieben durch Produktnummer und Stückzahl.",
    circularReality:
      "Jeder Artikel ist ein Individuum. Laptop #47 hat eine andere Batterie, andere Kratzer und andere Reparaturgeschichte als Laptop #48 — obwohl beide «ThinkPad T14» sind.",
    kivviAnswer:
      "Jeder Artikel bekommt eine eindeutige ID, QR-Code, Zustand, Seriennummer und vollständige Kostenhistorie. Kein SKU-Denken.",
  },
  {
    title: "Wertermittlung",
    erpAssumption:
      "Wert kommt vom Einkaufspreis. Alle gleichartigen Artikel haben denselben Buchwert. Preise sind regelbasiert (Einkauf × Faktor).",
    circularReality:
      "Wert entsteht durch Bewertung. Zwei identische Laptops derselben Marke können CHF 40 auseinanderliegen, weil einer neu bestückt wurde und der andere einen Displayfehler hat.",
    kivviAnswer:
      "Fünfstufiges Zustandssystem (Gut → Schrott), kombiniert mit Richtpreis und Mindestpreis pro Artikel. Bewertung bestimmt Preis — nicht umgekehrt.",
  },
  {
    title: "Kostenakkumulation",
    erpAssumption:
      "Kosten sind bei Wareneingang bekannt und unveränderlich. Kostenbasis = Einkaufspreis.",
    circularReality:
      "Kosten entstehen über Zeit: Intake-Preis (oder CHF 0 bei Spende) + Reinigung + Reparatur 1 + Ersatzteile + Reparatur 2 = effektive Kostenbasis erst kurz vor Verkauf bekannt.",
    kivviAnswer:
      "Reparaturprotokoll akkumuliert alle Kosten pro Artikel mit Datum, CHF-Betrag und Stunden. Marge wird gegen die aktuelle Kostenbasis gerechnet — immer aktuell.",
  },
  {
    title: "Warenherkunft",
    erpAssumption:
      "Waren kommen von Lieferanten mit Rechnung. Eine Quelle, ein Buchhaltungsvorgang.",
    circularReality:
      "Vier grundlegend verschiedene Quellen mit verschiedenen Rechtsfolgen: Spende (→ Quittungspflicht), Kauf (→ Lieferantenrechnung), Tausch/Rücknahme (→ Gutschrift), Kommission (→ Erlösteilung nach Verkauf).",
    kivviAnswer:
      "Wareneingang kennt alle vier Quelltypen. Spendenquittung, Lieferantenbeleg und Kommissionsprotokoll werden automatisch dem Vorgang zugeordnet.",
  },
  {
    title: "Preisgestaltung",
    erpAssumption:
      "Preise sind regelbasiert und einheitlich. Systeme optimieren für Margenziele auf Produktebene.",
    circularReality:
      "Preise sind einzelfallabhängig: Zustand des Artikels, aktuelle Nachfrage, Sozialrabatt für Bedürftige, Sonderaktion, Budgetanpassung im Verkaufsgespräch. Kein Algorithmus kann das vollständig automatisieren.",
    kivviAnswer:
      "Richtpreis und Mindestpreis als Leitplanken. Verkauf kann im Gespräch anpassen. Jede Preisänderung wird protokolliert. Das System unterstützt menschliche Entscheidung, ersetzt sie nicht.",
  },
  {
    title: "Donormanagement",
    erpAssumption:
      "Es gibt Lieferanten und Kunden. Beide erhalten Belege. Spendenlogik existiert nicht.",
    circularReality:
      "Spender sind weder Lieferanten noch Kunden. Sie erhalten Quittungen statt Rechnungen, werden nach Schweizer Spendenrecht behandelt, und die Beziehung ist für die Betriebe langfristig wertvoller als ein einzelner Kauf.",
    kivviAnswer:
      "Spender werden als eigener Kontakttyp geführt. Quittungen werden automatisch generiert. Spendenhistorie und ausgestellte Belege sind jederzeit abrufbar.",
  },
  {
    title: "Impact-Messung",
    erpAssumption: "ERP trackt Geld. Impact ist kein ERP-Thema.",
    circularReality:
      "Für Kreislaufbetriebe ist Impact ein Kern-KPI: Wie viele Geräte gerettet? Wie viel CO₂ vermieden? Wie viele Menschen mit günstigen Gütern versorgt? Diese Zahlen entscheiden über Fördergelder und Glaubwürdigkeit.",
    kivviAnswer:
      "Impact-Dashboard berechnet CO₂-Einsparung, Gerätezahlen und Personenzahlen aus definierten Werten pro Kategorie. Exportierbar für Förderanträge und Jahresberichte.",
  },
  {
    title: "Compliance",
    erpAssumption:
      "Standard-MwSt., Standard-Rechnung, Standard-Belege. Rechtsrahmen ist universell.",
    circularReality:
      "Kreislaufbetriebe in der Schweiz haben spezifische Pflichten: Spendenrecht (Quittungsinhalt), QR-Rechnung (seit 2022 gesetzlich), MWST-Sonderregelungen für Gebrauchtware, Datenlöschzertifikate für IT.",
    kivviAnswer:
      "QR-Rechnungen automatisch, Rappen-Rundung (0.05 CHF) korrekt, Spendenquittungen nach Schweizer Recht vorausgefüllt, Datenlöschzertifikate (nDSG / NIST SP 800-88) herunterladbar. Kein manueller Compliance-Aufwand.",
  },
];

export default function WhyKivviPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
          Das Argument
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Warum ein eigenes ERP?
        </h1>
        <p className="text-xl text-muted-foreground">
          Kivvi ist kein universelles ERP. Es ist das Betriebssystem für
          Kreislaufbetriebe — gebaut auf anderen Grundannahmen. Acht
          Dimensionen, die erklären warum Standard-ERPs strukturell scheitern.
        </p>
      </section>

      {/* The core argument */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-warning/5 p-8">
          <h2 className="mb-3 text-xl font-bold">
            Das ist kein Feature-Problem — es ist ein Modell-Problem.
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Ein Standard-ERP kann man mit Umwegen für Kreislaufbetriebe
            verwenden. Man kann Workarounds bauen, Sonderfelder missbrauchen,
            Prozesse anpassen. Das kostet Zeit, Nerven und produziert Fehler.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Das eigentliche Problem ist tiefer: Standard-ERPs wurden für eine
            Welt gebaut, in der Güter einen festen Wert haben, von Lieferanten
            kommen, auf Lager liegen und an Kunden verkauft werden.
            Kreislaufbetriebe funktionieren anders — nicht in einem Detail,
            sondern in der Grundstruktur.
          </p>
        </div>
      </section>

      {/* 8 dimensions */}
      <section className="mx-auto max-w-4xl py-16">
        <div className="space-y-6">
          {DIMENSIONS.map((d, i) => (
            <DimensionCard key={d.title} number={i + 1} {...d} />
          ))}
        </div>
      </section>

      {/* Summary */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-primary/5 p-8">
          <h2 className="mb-4 text-xl font-bold">
            Die Alternative: Nichts oder Excel
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Viele Kreislaufbetriebe arbeiten heute mit Excel-Tabellen,
            Notizbüchern oder gar keiner Software — nicht weil sie keine
            digitale Lösung wollen, sondern weil keine verfügbare Lösung zu
            ihrem Betrieb passt.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Das hat Konsequenzen: Margen sind Schätzungen. Impact ist nicht
            belegbar. Spendenquittungen werden manuell getippt. Jede Migration
            in ein neues System bedeutet Datenverlust.
          </p>
          <p className="font-medium text-foreground">
            Kivvi ist keine perfekte Lösung — aber es ist die erste, die mit dem
            richtigen Modell startet.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">
          Überzeugt? Oder noch Fragen?
        </h2>
        <p className="mb-8 text-muted-foreground">
          Demo anfragen oder direkt ausprobieren — die erste Einrichtung dauert
          10 Minuten.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/contact">
              Demo anfragen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/register">
              Kivvi ausprobieren <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 flex justify-center gap-6 text-sm">
          <Link
            href="/how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Wie es funktioniert →
          </Link>
          <Link
            href="/circular-economy"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Kreislaufwirtschaft verstehen →
          </Link>
        </div>
      </section>
    </>
  );
}

function DimensionCard({
  number,
  title,
  erpAssumption,
  circularReality,
  kivviAnswer,
}: {
  number: number;
  title: string;
  erpAssumption: string;
  circularReality: string;
  kivviAnswer: string;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="border-b px-6 py-4 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
          {String(number).padStart(2, "0")}
        </span>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
        <div className="p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-destructive/70">
            Standard-ERP nimmt an
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {erpAssumption}
          </p>
        </div>
        <div className="p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-warning">
            Kreislaufbetrieb braucht
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {circularReality}
          </p>
        </div>
        <div className="p-5 bg-primary/5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary/70">
            Kivvis Antwort
          </p>
          <p className="text-sm leading-relaxed">{kivviAnswer}</p>
        </div>
      </div>
    </div>
  );
}
