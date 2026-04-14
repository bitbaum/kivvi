import Link from "next/link";
import { ArrowRight, Recycle } from "lucide-react";
import { buildPageMeta } from "@/lib/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kreislaufwirtschaft verstehen — Kivvi",
  description:
    "Wer sind die Teilnehmer der Kreislaufwirtschaft? Welche Geschäftsmodelle gibt es? Was macht sie fundamentell anders als die Linearwirtschaft?",
  ...buildPageMeta(
    "Kreislaufwirtschaft verstehen — Kivvi",
    "Wer sind die Teilnehmer der Kreislaufwirtschaft? Welche Geschäftsmodelle gibt es? Was macht sie fundamentell anders als die Linearwirtschaft?",
  ),
};

const PARTICIPANTS = [
  {
    name: "IT-Refurbisher",
    description:
      "Sammeln ausgemusterte Elektronik von Unternehmen, testen, reparieren und verkaufen sie weiter. Oft auch mit Datenlöschzertifikaten und Businesskunden.",
    examples: "Laptops, Desktops, Server, Tablets, Smartphones",
    href: "/for/it-refurbishers",
  },
  {
    name: "Brockenhäuser & Sozialkaufhäuser",
    description:
      "Nehmen gespendete Güter an und verkaufen sie günstig weiter — oft mit sozialem Auftrag (Integration, Beschäftigung, günstige Versorgung einkommensschwacher Haushalte).",
    examples: "Möbel, Haushaltsgeräte, Kleidung, Bücher, Spielzeug",
    href: "/for/brockenhaeuser",
  },
  {
    name: "Repair Cafés & Werkstätten",
    description:
      "Reparieren defekte Gegenstände — oft mit Freiwilligen, manchmal professionell. Ziel: Reparatur statt Neukauf verankern.",
    examples: "Elektrogeräte, Fahrräder, Kleidung, Möbel, Spielzeug",
    href: "/for/repair-cafes",
  },
  {
    name: "Vintage & Second-Hand-Shops",
    description:
      "Spezialisiert auf bestimmte Warenkategorien mit Wiederverkaufswert. Qualität und Kuratierung sind das Produkt.",
    examples: "Kleidung, Schmuck, Uhren, Möbel, Vinyl, Sammlerstücke",
    href: "/for/vintage",
  },
  {
    name: "Fahrrad-Refurbisher",
    description:
      "Nehmen alte oder defekte Fahrräder an, reparieren und restaurieren sie. Wachsender Markt durch E-Bike-Boom und Urban Mobility.",
    examples: "City-Bikes, E-Bikes, Rennräder, Kindervelos",
    href: null,
  },
  {
    name: "Upcycling-Ateliers",
    description:
      "Verarbeiten Materialien und Gegenstände zu neuen Produkten. Die Transformation ist Teil des Werts — Design als Handwerk.",
    examples: "Palettenmöbel, Textil-Upcycling, Kunstobjekte aus Abfall",
    href: null,
  },
  {
    name: "Soziale Unternehmen & NGOs",
    description:
      "Nutzen Kreislaufprozesse als Beschäftigungsmodell oder Finanzierungsquelle für den sozialen Auftrag. Spendenquittungen und Impact-Nachweis sind essenziell.",
    examples: "Beschäftigungsprogramme, Integrationsbetriebe, Hilfswerke",
    href: null,
  },
  {
    name: "Take-Back-Programme",
    description:
      "Hersteller oder Händler nehmen Produkte am Ende des Lebenszyklus zurück — zur Wiederaufbereitung, Weitergabe oder Recycling.",
    examples: "Elektronikhersteller, Modeketten, Möbelhändler",
    href: null,
  },
];

const BUSINESS_MODELS = [
  {
    name: "Spende → Aufbereitung → Verkauf",
    description:
      "Das klassische Brockenhaus-Modell. Waren kommen kostenlos rein (Spende), werden aufbereitet und zum Sozialtarif verkauft. Herausforderung: Kosten entstehen ausschliesslich durch Aufbereitung.",
    accounting:
      "Null-Einkaufspreis, Reparatur-/Reinigungskosten als Kostenbasis",
    who: "Brockenhäuser, NGOs, Kleidersammlungen",
  },
  {
    name: "Einkauf → Refurbishing → Weiterverkauf",
    description:
      "Güter werden günstig eingekauft (von Unternehmen, Auktionen, Einzelpersonen), aufgewertet und mit Marge weiterverkauft. IT-Refurbisher und Vintage-Shops.",
    accounting:
      "Einkaufspreis + Reparaturkosten = Kostenbasis. Marge pro Einheit kritisch.",
    who: "IT-Refurbisher, Vintage-Shops, Fahrrad-Ateliers",
  },
  {
    name: "Reparatur-als-Service",
    description:
      "Der Kunde bringt ein defektes Gerät — der Betrieb repariert gegen Entgelt. Das Eigentum bleibt beim Kunden. Kostenkalkulierung pro Auftrag ist zentral.",
    accounting: "Arbeitsstunden + Ersatzteile = Rechnungsbetrag",
    who: "Repair Cafés (Werkstattteil), Veloläden, Elektriker",
  },
  {
    name: "Kommission / Konsignation",
    description:
      "Privatpersonen geben Gegenstände ab — der Betrieb verkauft sie und behält eine Provision. Das Eigentum liegt bis zum Verkauf beim Einlieferer.",
    accounting:
      "Kein Einkauf, Erlösteilung nach Verkauf. Einlieferer-Tracking notwendig.",
    who: "Kleiderbörsen, Second-Hand-Shops, Auktionshäuser",
  },
  {
    name: "Upcycling & Transformation",
    description:
      "Materialien werden zu neuen Produkten verarbeitet. Der Wert entsteht durch Design und Handwerk — nicht durch Wiederverkauf des Originals.",
    accounting:
      "Material + Arbeitszeit = Kostenbasis. Produktkalkulation wie Handwerk.",
    who: "Upcycling-Ateliers, Designstudios, Soziale Werkstätten",
  },
  {
    name: "Teile-Harvesting",
    description:
      "Defekte Geräte werden nicht repariert, sondern in Einzelteile zerlegt. Die Teile werden separat verkauft oder für andere Reparaturen genutzt.",
    accounting:
      "Ein Gerät → viele Teile mit je eigenem Wert. Stücklisten-Logik.",
    who: "IT-Refurbisher (Ergänzungsmodell), Fahrradläden",
  },
  {
    name: "Tausch & Sharing",
    description:
      "Güter werden nicht verkauft, sondern verliehen oder getauscht. Mitgliedschafts- oder Nutzungsgebühren finanzieren den Betrieb.",
    accounting: "Gebührenmodell, kein klassischer Warenverkauf",
    who: "Bibliotheken der Dinge, Werkzeugverleihe, Swap-Events",
  },
];

const DIMENSIONS = [
  {
    title: "Warenwert",
    linear:
      "Definiert durch Einkaufspreis + Marge. Gilt für alle gleichartigen Waren identisch.",
    circular:
      "Zustandsabhängig: Zwei identische Laptops derselben Marke können CHF 40 auseinanderliegen, weil einer Kratzer hat und der andere nicht.",
  },
  {
    title: "Artikelverfolgung",
    linear: "«100 ThinkPad T14 auf Lager». SKU + Menge reichen.",
    circular:
      "Jedes Gerät ist ein Individuum mit eigener ID, Zustand, Geschichte, Reparaturkosten und Verkaufspreis.",
  },
  {
    title: "Kosten",
    linear:
      "Bekannt bei Wareneingang. Unveränderlich. Kostenbasis = Einkaufspreis.",
    circular:
      "Akkumulieren über Zeit: Intake-Preis (oder 0 bei Spende) + Reparatur 1 + Reparatur 2 + … = Kostenbasis.",
  },
  {
    title: "Warenherkunft",
    linear: "Lieferant mit Rechnung. Eine Quelle, ein Prozess.",
    circular:
      "Spende (→ Quittung), Kauf (→ Lieferantenrechnung), Rücknahme (→ Gutschrift), Kommission (→ Erlösteilung) — vier völlig verschiedene Buchhaltungsvorgänge.",
  },
  {
    title: "Preisgestaltung",
    linear:
      "Regelbasiert: Einkaufspreis × Faktor = Verkaufspreis. Einheitlich und skalierbar.",
    circular:
      "Einzelfallentscheidung: Zustand × Nachfrage × Sozialfaktor. Zwei gleiche Artikel, zwei verschiedene Preise.",
  },
  {
    title: "Impact",
    linear: "Nicht relevant. Software trackt Geld, nicht Wirkung.",
    circular:
      "Kern-KPI: Wie viele Geräte gerettet? Wie viel CO₂ vermieden? Für Förderanträge, Jahresberichte und Kundenkommunikation essenziell.",
  },
];

export default function CircularEconomyPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Recycle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Die Kreislaufwirtschaft
        </h1>
        <p className="text-xl text-muted-foreground">
          Wer sind die Betriebe, die Waren ein zweites Leben geben? Welche
          Geschäftsmodelle gibt es? Und warum brauchen sie andere Software als
          alle anderen?
        </p>
      </section>

      {/* In-page anchor nav */}
      <nav className="mx-auto max-w-3xl mb-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { href: "#teilnehmer", label: "Teilnehmer" },
            { href: "#geschaeftsmodelle", label: "Geschäftsmodelle" },
            { href: "#dimensionen", label: "Was macht sie anders?" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full border bg-card px-4 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Definition */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-4 text-xl font-bold">
            Was ist Kreislaufwirtschaft?
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Die Linearwirtschaft folgt einem einfachen Muster: Herstellen →
            Kaufen → Wegwerfen. Die Kreislaufwirtschaft bricht dieses Muster.
            Güter werden repariert, wiederaufbereitet, weiterverkauft,
            umgewandelt oder geteilt — statt auf der Deponie zu landen.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            In der Schweiz gibt es Hunderte von Betrieben, die das täglich
            praktizieren: Brockenhäuser, IT-Refurbisher, Repair Cafés,
            Kleiderbörsen, Veloläden. Viele sind soziale Unternehmen. Viele
            arbeiten mit Freiwilligen. Fast alle kämpfen mit der gleichen
            Herausforderung: Ihre Software wurde nie für sie gebaut.
          </p>
          <p className="font-medium text-foreground">
            Kivvi wurde für sie gebaut.
          </p>
        </div>
      </section>

      {/* Participants */}
      <section id="teilnehmer" className="mx-auto max-w-4xl py-16 scroll-mt-16">
        <h2 className="mb-3 text-2xl font-bold">Wer ist dabei?</h2>
        <p className="mb-8 text-muted-foreground">
          Die Kreislaufwirtschaft ist breiter, als man denkt. Hier sind die
          Hauptakteure:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PARTICIPANTS.map((p) => (
            <div key={p.name} className="rounded-xl border bg-card p-6">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold">{p.name}</h3>
                {p.href && (
                  <Link
                    href={p.href}
                    className="shrink-0 text-xs font-medium text-primary hover:underline"
                  >
                    Mehr →
                  </Link>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {p.description}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Typische Waren:</span>{" "}
                {p.examples}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Business models */}
      <section
        id="geschaeftsmodelle"
        className="mx-auto max-w-4xl py-8 scroll-mt-16"
      >
        <h2 className="mb-3 text-2xl font-bold">Die Geschäftsmodelle</h2>
        <p className="mb-8 text-muted-foreground">
          Nicht alle Kreislaufbetriebe funktionieren gleich. Die Unterschiede im
          Geschäftsmodell bestimmen, welche Software-Anforderungen entstehen.
        </p>
        <div className="space-y-4">
          {BUSINESS_MODELS.map((m) => (
            <div
              key={m.name}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div className="border-b px-6 py-4">
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{m.who}</p>
              </div>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
                <div className="px-6 py-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {m.description}
                  </p>
                </div>
                <div className="px-6 py-4 bg-muted/30">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Buchhaltungslogik
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {m.accounting}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What makes circular different */}
      <section
        id="dimensionen"
        className="mx-auto max-w-4xl py-16 scroll-mt-16"
      >
        <h2 className="mb-3 text-2xl font-bold">
          Was die Kreislaufwirtschaft fundamental anders macht
        </h2>
        <p className="mb-8 text-muted-foreground">
          Diese sechs Dimensionen erklären, warum Standard-ERPs strukturell
          scheitern — und warum eine eigene Lösung nötig ist.
        </p>
        <div className="space-y-4">
          {DIMENSIONS.map((d, i) => (
            <div
              key={d.title}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div className="border-b px-6 py-3 flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-semibold">{d.title}</h3>
              </div>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
                <div className="px-6 py-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Linearwirtschaft
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {d.linear}
                  </p>
                </div>
                <div className="px-6 py-4 bg-primary/5">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-primary/70">
                    Kreislaufwirtschaft
                  </p>
                  <p className="text-sm leading-relaxed">{d.circular}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bridges to vertical pages and why-kivvi */}
      <section className="mx-auto max-w-4xl py-8 pb-16">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/why-kivvi"
            className="group rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Nächste Frage
            </p>
            <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
              Warum braucht die Kreislaufwirtschaft ein eigenes ERP?
            </h3>
            <p className="text-sm text-muted-foreground">
              8 Dimensionen, in denen Standard-Software strukturell scheitert —
              und wie Kivvi antwortet.
            </p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
              Warum Kivvi <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
          <Link
            href="/how-it-works"
            className="group rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              In der Praxis
            </p>
            <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
              Wie funktioniert Kivvi im Alltag?
            </h3>
            <p className="text-sm text-muted-foreground">
              Die drei Phasen — Intake, Bewertung & Reparatur, Verkauf & Impact
              — im Detail.
            </p>
            <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
              Wie es funktioniert <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        </div>
      </section>
    </>
  );
}
