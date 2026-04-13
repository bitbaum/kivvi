import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";

// ============================================================
// Article definitions — add new articles here
// ============================================================

// Ordered list of slugs for next-article navigation
const ARTICLE_ORDER = [
  "zustandsbewertung",
  "impact-messen",
  "spendenquittungen",
  "kivitendo-migration",
  "preisgestaltung-secondhand",
  "qr-rechnung-schweiz",
];

const ARTICLES: Record<string, Article> = {
  zustandsbewertung: {
    title: "Zustandsbewertung: Die 5 Stufen",
    tag: "Betrieb",
    readTime: "5 min",
    lead: "Konsistente Zustandsbewertungen sind die Grundlage für faire Preise, Kundenvertrauen und aussagekräftige Impact-Zahlen. Dieses System funktioniert für IT, Kleidung, Möbel und Fahrräder.",
    sections: [
      "Warum konsistente Bewertungen wichtig sind",
      "Die 5 Stufen",
      "Wie Zustand den Preis beeinflusst",
      "Praktische Umsetzung",
    ],
    content: <ZustandsbewertungArticle />,
  },
  "impact-messen": {
    title: "Impact messen in der Kreislaufwirtschaft",
    tag: "Impact",
    readTime: "7 min",
    lead: "CO₂-Einsparung, Geräte gerettet, Menschen bedient — wie berechnet man Impact seriös? Methodik, Kennzahlen und Dokumentation für Förderanträge und Jahresberichte.",
    sections: [
      "Warum Impact-Zahlen wichtig sind",
      "Die drei Kernkennzahlen",
      "CO₂-Faktoren nach Kategorie (Richtwerte)",
      "Für Förderanträge",
    ],
    content: <ImpactMessenArticle />,
  },
  spendenquittungen: {
    title: "Spendenquittungen korrekt ausstellen",
    tag: "Compliance",
    readTime: "6 min",
    lead: "Was muss eine Spendenquittung in der Schweiz enthalten? Was ist steuerlich abzugsfähig? Ein praxisnaher Leitfaden für Brockenhäuser und gemeinnützige Betriebe.",
    sections: [
      "Wann muss eine Quittung ausgestellt werden?",
      "Pflichtangaben auf der Quittung",
      "Sachspenden: Wert schätzen",
      "Was ist abzugsfähig?",
      "Kivvi automatisiert die Quittung",
    ],
    content: <SpendenquittungenArticle />,
  },
  "kivitendo-migration": {
    title: "Von Kivitendo zu Kivvi migrieren",
    tag: "Migration",
    readTime: "8 min",
    lead: "Noch in Kivitendo? So exportieren Sie Kundenstammdaten, Artikel und offene Posten — und importieren sie in wenigen Stunden in Kivvi. Kein Engineering, kein Datenverlust.",
    sections: [
      "Warum jetzt wechseln?",
      "Was wird importiert?",
      "Schritt für Schritt: Export aus Kivitendo",
      "Schritt für Schritt: Import in Kivvi",
      "Nach dem Import",
    ],
    content: <KivitendoMigrationArticle />,
  },
  "preisgestaltung-secondhand": {
    title: "Preisgestaltung für gebrauchte Waren",
    tag: "Betrieb",
    readTime: "6 min",
    lead: "Gebrauchte Waren haben keinen Listenpreis. Wie findet man Preise, die fair für Kunden, kostendeckend für den Betrieb und konsistent für das Team sind? Strategien für IT, Kleidung, Möbel und Velos.",
    sections: [
      "Das Dilemma der Preisgestaltung",
      "Methoden der Preisfindung",
      "Reparaturkosten einkalkulieren",
      "Sozialrabatte: Wann und wie?",
      "Mit Kivvi Preise verwalten",
    ],
    content: <PreisgestaltungSecondhandArticle />,
  },
  "qr-rechnung-schweiz": {
    title: "QR-Rechnung: Was Kreislaufbetriebe wissen müssen",
    tag: "Compliance",
    readTime: "5 min",
    lead: "Seit 2022 gesetzlich vorgeschrieben: Rechnungen brauchen einen QR-Einzahlungsschein. Was Kreislaufbetriebe über Pflichtangaben, MWST-Besonderheiten und Rappen-Rundung wissen müssen.",
    sections: [
      "Was ist die QR-Rechnung?",
      "Wer braucht sie?",
      "Pflichtangaben",
      "MWST bei Kreislaufbetrieben",
      "Rappen-Rundung: CHF 0.05",
      "Kivvi automatisiert QR-Rechnungen",
    ],
    content: <QrRechnungSchweizArticle />,
  },
};

type Article = {
  title: string;
  tag: string;
  readTime: string;
  lead: string;
  sections: string[];
  content: React.ReactNode;
};

function slugifySection(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" })[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ============================================================
// Page
// ============================================================

export async function generateStaticParams() {
  return Object.keys(ARTICLES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES[slug];
  if (!article) return {};
  return {
    title: `${article.title} — Kivvi Wissensdatenbank`,
    description: article.lead,
  };
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = ARTICLES[slug];
  if (!article) notFound();

  const currentIndex = ARTICLE_ORDER.indexOf(slug);
  const nextSlug =
    currentIndex >= 0 ? ARTICLE_ORDER[currentIndex + 1] : undefined;
  const nextArticle = nextSlug ? ARTICLES[nextSlug] : undefined;

  return (
    <>
      <div className="mx-auto max-w-3xl py-8">
        {/* Back link */}
        <Link
          href="/knowledge"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Wissensdatenbank
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {article.tag}
            </span>
            <span className="text-xs text-muted-foreground">
              {article.readTime} Lesezeit
            </span>
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {article.lead}
          </p>
        </div>

        {/* Table of contents */}
        <nav className="mb-10 rounded-xl border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inhalt
          </p>
          <ol className="space-y-1.5">
            {article.sections.map((section, i) => (
              <li key={section}>
                <a
                  href={`#${slugifySection(section)}`}
                  className="flex items-baseline gap-2.5 text-sm hover:text-primary transition-colors"
                >
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span>{section}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {article.content}
        </div>

        {/* Next article */}
        {nextArticle && nextSlug && (
          <div className="mt-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nächster Artikel
            </p>
            <Link
              href={`/knowledge/${nextSlug}`}
              className="group flex items-center justify-between rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {nextArticle.tag}
                </span>
                <h3 className="mt-2 font-semibold group-hover:text-primary transition-colors">
                  {nextArticle.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {nextArticle.lead}
                </p>
              </div>
              <ArrowRight className="ml-4 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-6 rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold">Mehr aus der Wissensdatenbank</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Weitere Artikel zu Betrieb, Compliance und Impact in der
            Kreislaufwirtschaft.
          </p>
          <Link
            href="/knowledge"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Alle Artikel ansehen →
          </Link>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Article content components
// ============================================================

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={slugifySection(title)} className="mt-10 scroll-mt-20">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-muted-foreground leading-relaxed">{children}</p>
  );
}

function ZustandsbewertungArticle() {
  return (
    <>
      <Section title="Warum konsistente Bewertungen wichtig sind">
        <P>
          Wenn zwei Mitarbeitende denselben Laptop unterschiedlich bewerten —
          einer sagt «Gut», die andere «Mittel» — entstehen Preisinkonsistenzen,
          die Kunden verwirren und Margen verfälschen. Schlimmer: Der
          Impact-Bericht zählt «Geräte in gutem Zustand» und produziert Zahlen,
          die nicht der Realität entsprechen.
        </P>
        <P>
          Ein klares, schriftlich definiertes Bewertungssystem ist kein
          bürokratischer Aufwand — es ist das Fundament für Preise,
          Kundenkommunikation und Impact-Nachweis.
        </P>
      </Section>

      <Section title="Die 5 Stufen">
        <div className="space-y-4">
          {[
            {
              level: "Gut",
              color: "border-l-green-500",
              it: "Kaum Gebrauchsspuren, alle Funktionen einwandfrei, Akku über 80%",
              kleidung: "Wie neu, keine sichtbaren Spuren, keine Pilling",
              moebel:
                "Keine Kratzer, keine Beschädigungen, vollständig funktional",
              velo: "Rahmen ohne Roststellen, alle Komponenten voll funktional",
            },
            {
              level: "Mittel",
              color: "border-l-blue-500",
              it: "Sichtbare Kratzer oder Dellen, alle Funktionen intakt, Akku 60–80%",
              kleidung:
                "Leichte Gebrauchsspuren, minimales Pilling, keine Beschädigungen",
              moebel: "Kleine Kratzer, leichte Verfärbungen, voll funktional",
              velo: "Leichter Rostflecken, Gebrauchsspuren an Bauteilen, funktional",
            },
            {
              level: "Schlecht",
              color: "border-l-amber-500",
              it: "Starke Kratzer, Funktionseinschränkungen möglich, Akku unter 60%",
              kleidung:
                "Deutliche Gebrauchsspuren, Pilling, kleine Flecken — noch tragbar",
              moebel:
                "Deutliche Kratzer, Beschädigungen an nicht-tragenden Teilen",
              velo: "Sichtbarer Rost, Verschleiß an Bremsen/Kette, braucht Wartung",
            },
            {
              level: "Für Teile",
              color: "border-l-orange-500",
              it: "Teilweise defekt (Display, Tastatur), gut als Ersatzteillager",
              kleidung: "Riss, Loch, Fleck — für Upcycling oder Reparatur",
              moebel:
                "Strukturschäden, nur Teile (Scharniere, Platten) nutzbar",
              velo: "Rahmenbruch oder Totalschaden, Teile noch brauchbar",
            },
            {
              level: "Schrott",
              color: "border-l-red-500",
              it: "Nicht funktionsfähig, keine verwertbaren Teile — Recycling",
              kleidung: "Nicht tragbar, nicht upcyclebar — Entsorgung",
              moebel:
                "Nicht verwertbar, gefährlich (Schimmel, Schadstoffe) — Entsorgung",
              velo: "Materialermüdung oder Sicherheitsrisiko — Schrottplatz",
            },
          ].map((s) => (
            <div
              key={s.level}
              className={`rounded-xl border-l-4 p-5 ${s.color}`}
            >
              <h3 className="font-semibold mb-3">{s.level}</h3>
              <div className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">IT:</span>{" "}
                  {s.it}
                </div>
                <div>
                  <span className="font-medium text-foreground">Kleidung:</span>{" "}
                  {s.kleidung}
                </div>
                <div>
                  <span className="font-medium text-foreground">Möbel:</span>{" "}
                  {s.moebel}
                </div>
                <div>
                  <span className="font-medium text-foreground">Velo:</span>{" "}
                  {s.velo}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Wie Zustand den Preis beeinflusst">
        <P>
          Eine grobe Faustregel für IT: Gut = 70–80% des Neupreises, Mittel =
          40–60%, Schlecht = 20–35%, Für Teile = 5–15%. Diese Bandbreiten
          variieren stark nach Marke, Modell und Nachfrage. Kivvi ermöglicht
          einen Richtpreis und Mindestpreis pro Artikel — die Verkaufsperson
          entscheidet im Gespräch.
        </P>
        <P>
          Wichtig: Reparaturkosten erhöhen die Kostenbasis und müssen
          einkalkuliert werden. Ein Laptop mit neuer Batterie (CHF 40) und neuem
          Speicher (CHF 30) hat eine Kostenbasis von CHF 70 — auch wenn er
          kostenlos gespendet wurde.
        </P>
      </Section>

      <Section title="Praktische Umsetzung">
        <P>
          Empfehlung: Drucken Sie die Bewertungskriterien aus und hängen Sie sie
          an jedem Bewertungsplatz auf. Führen Sie bei neuen Mitarbeitenden eine
          kurze Kalibrierung durch — beide bewerten dieselben 5 Artikel und
          vergleichen dann. Unterschiede diskutieren und Kriterien schärfen.
        </P>
        <P>
          In Kivvi wird die Zustandsstufe bei jedem Artikel erfasst und
          erscheint auf dem QR-Etikett und im Artikeldatensatz. Das macht die
          Bewertung nachvollziehbar und auswertbar.
        </P>
      </Section>
    </>
  );
}

function ImpactMessenArticle() {
  return (
    <>
      <Section title="Warum Impact-Zahlen wichtig sind">
        <P>
          Förderanträge, Jahresberichte, Medienanfragen,
          Unternehmenspartnerschaften — überall wird gefragt: «Was bewirken
          Sie?» Die Antwort «Wir reparieren Sachen» reicht nicht. Konkrete,
          belegbare Zahlen sind entscheidend.
        </P>
        <P>
          Das Problem: Impact-Zahlen sind oft nicht seriös berechnet.
          CO₂-Einsparungen werden überschätzt, Vergleichswerte nicht genannt,
          Methodiken nicht offengelegt. Das schadet der Glaubwürdigkeit der
          gesamten Branche.
        </P>
      </Section>

      <Section title="Die drei Kernkennzahlen">
        <div className="space-y-4">
          {[
            {
              name: "Geräte / Artikel gerettet",
              description:
                "Anzahl Gegenstände, die durch Ihren Betrieb einer neuen Nutzung zugeführt wurden statt auf der Deponie zu landen.",
              calculation:
                "Einfach: Alle verkauften Artikel (nicht gespendete, nicht verschrottete)",
              caveat:
                "Nur Artikel zählen, die tatsächlich eine zweite Nutzung gefunden haben. Für-Teile-Artikel zählen anteilig, Schrott zählt nicht.",
            },
            {
              name: "CO₂-Einsparung (kg)",
              description:
                "Wie viel CO₂ wurde vermieden, weil Ihr Betrieb die Neuproduktion ersetzte?",
              calculation:
                "Anzahl Artikel × Kategorie-spezifischer CO₂-Faktor (kg CO₂-Äquivalent für Neuproduktion). Laptop: ~300 kg, Smartphone: ~70 kg, Jeans: ~8 kg, Fahrrad: ~150 kg.",
              caveat:
                "Die Faktoren stammen aus Lebenszyklusanalysen (LCA). Richtige Quellen: Fraunhofer IVV, Ecoinvent, wissenschaftliche Publikationen. Immer Quelle nennen.",
            },
            {
              name: "Menschen bedient / versorgt",
              description:
                "Wie viele Personen haben von Ihrem Angebot profitiert — direkt (Käufer günstigerer Güter) oder indirekt (Förderung durch Betrieb)?",
              calculation:
                "Transaktionen (≠ Kunden, da ein Kunde mehrfach kaufen kann) + Freiwillige + Beschäftigte in Integration.",
              caveat:
                "Nicht übertreiben. «Menschen bedient» ist keine wissenschaftliche Zahl — als ergänzende Zahl sinnvoll, nicht als Hauptkennzahl.",
            },
          ].map((k) => (
            <div key={k.name} className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-2">{k.name}</h3>
              <P>{k.description}</P>
              <div className="mt-3 rounded-lg bg-muted/50 p-4 text-sm">
                <div className="mb-2">
                  <span className="font-medium">Berechnung:</span>{" "}
                  {k.calculation}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium">Achtung:</span> {k.caveat}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="CO₂-Faktoren nach Kategorie (Richtwerte)">
        <P>
          Diese Werte basieren auf veröffentlichten Lebenszyklusanalysen und
          gelten als Richtwerte. Für wissenschaftliche Publikationen bitte
          eigene Quellen recherchieren.
        </P>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 text-left font-medium">Kategorie</th>
                <th className="py-2 pr-4 text-right font-medium">
                  CO₂-Faktor (kg)
                </th>
                <th className="py-2 text-left font-medium text-muted-foreground">
                  Quelle/Basis
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                {
                  cat: "Laptop / Notebook",
                  co2: "~300 kg",
                  basis: "Fraunhofer, variiert stark je Hersteller",
                },
                { cat: "Desktop-PC", co2: "~400 kg", basis: "Inkl. Monitor" },
                {
                  cat: "Smartphone",
                  co2: "~70 kg",
                  basis: "Apple/Samsung LCA-Berichte",
                },
                {
                  cat: 'Monitor 24"',
                  co2: "~80 kg",
                  basis: "Durchschnittswert",
                },
                {
                  cat: "Jeans (Neuproduktion)",
                  co2: "~8 kg",
                  basis: "Textile Exchange",
                },
                { cat: "T-Shirt", co2: "~3 kg", basis: "Textile Exchange" },
                {
                  cat: "Fahrrad",
                  co2: "~150 kg",
                  basis: "Inkl. Alu-Rahmen-Herstellung",
                },
                {
                  cat: "E-Bike",
                  co2: "~350 kg",
                  basis: "Inkl. Akku-Produktion",
                },
              ].map((r) => (
                <tr key={r.cat}>
                  <td className="py-2 pr-4">{r.cat}</td>
                  <td className="py-2 pr-4 text-right font-medium">{r.co2}</td>
                  <td className="py-2 text-muted-foreground text-xs">
                    {r.basis}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Für Förderanträge">
        <P>
          Förderanträge verlangen in der Regel: Kennzahl + Berechnungsmethode +
          Quelle + Vergleichszeitraum. Wichtig: Verwenden Sie konsistente
          Methoden über mehrere Jahre, damit Entwicklungen nachvollziehbar sind.
        </P>
        <P>
          Kivvi exportiert Impact-Daten als CSV. Damit können Sie die Rohdaten
          in eigene Berichte einbauen und die Berechnung transparent nachweisen.
        </P>
      </Section>
    </>
  );
}

function SpendenquittungenArticle() {
  return (
    <>
      <Section title="Wann muss eine Quittung ausgestellt werden?">
        <P>
          In der Schweiz sind Zuwendungen an gemeinnützige Organisationen (Art.
          33a und 59 Abs. 1 lit. c DBG) steuerlich abzugsfähig — sofern die
          Organisation als gemeinnützig anerkannt ist und die Zuwendung
          ordnungsgemäss dokumentiert ist.
        </P>
        <P>
          Als Faustregel: Wenn Ihr Betrieb als gemeinnützig anerkannt ist und
          Spenden oder Sachspenden annimmt, sollten Sie auf Wunsch des Spenders
          eine Quittung ausstellen. Pflicht ist es nicht generell — aber ohne
          Quittung kann der Spender den Betrag nicht abziehen.
        </P>
      </Section>

      <Section title="Pflichtangaben auf der Quittung">
        <P>
          Für die steuerliche Abzugsfähigkeit müssen folgende Angaben enthalten
          sein:
        </P>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="divide-y">
            {[
              {
                field: "Name und Adresse der Organisation",
                note: "Vollständig, wie im Handelsregister",
              },
              {
                field: "Name und Adresse des Spenders",
                note: "Vollständig — für die Steuerbehörde",
              },
              {
                field: "Datum der Zuwendung",
                note: "Eingang der Spende, nicht Ausstellungsdatum der Quittung",
              },
              {
                field: "Art der Zuwendung",
                note: "Geldspende (Betrag in CHF) oder Sachspende (Beschreibung und Schätzwert)",
              },
              {
                field: "Bestätigung der Gemeinnützigkeit",
                note: "«Als gemeinnützig anerkannte Organisation gemäss Art. 33a DBG»",
              },
              {
                field: "Unterschrift / Stempel",
                note: "Bei Sachspenden empfohlen, bei Geldspenden oft ausreichend mit Briefkopf",
              },
            ].map((f) => (
              <div
                key={f.field}
                className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x"
              >
                <div className="px-5 py-3 font-medium text-sm">{f.field}</div>
                <div className="px-5 py-3 text-sm text-muted-foreground">
                  {f.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Sachspenden: Wert schätzen">
        <P>
          Bei Sachspenden muss ein Schätzwert angegeben werden. Dieser Wert ist
          der Verkehrswert zum Zeitpunkt der Spende — also was das Gut auf dem
          freien Markt wert wäre, nicht der Neupreis.
        </P>
        <P>
          Als Kreislaufbetrieb sind Sie gut positioniert, um realistische
          Schätzwerte anzugeben — Sie sehen täglich Marktpreise für gebrauchte
          Güter. Dokumentieren Sie Ihre Schätzmethode intern (z.B. «Richtpreis
          gemäss Kivvi minus 20% Zustandsabschlag»). Falls der Spender einen
          sehr hohen Wert behauptet, dürfen Sie eine realistischere Schätzung
          auf der Quittung verwenden.
        </P>
      </Section>

      <Section title="Was ist abzugsfähig?">
        <P>
          Abzugsfähig sind Zuwendungen an anerkannte gemeinnützige
          Organisationen:
        </P>
        <div className="space-y-2 text-sm">
          {[
            { type: "Geldspende", abz: "Ja, Betrag in CHF" },
            {
              type: "Sachspende (Gebrauchtware)",
              abz: "Ja, Verkehrswert (Schätzung)",
            },
            {
              type: "Ehrenamtliche Arbeit",
              abz: "Nein — Zeit ist nicht abzugsfähig",
            },
            {
              type: "Sachleistungen unter dem Marktpreis verkauft",
              abz: "Nur die Differenz (Rabatt), nicht der Verkaufspreis",
            },
          ].map((r) => (
            <div
              key={r.type}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <span>{r.type}</span>
              <span
                className={`text-xs font-medium ${r.abz.startsWith("Ja") ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}
              >
                {r.abz}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Kivvi automatisiert die Quittung">
        <P>
          In Kivvi wird beim Wareneingang die Quelle erfasst (Spende, Kauf,
          Rücknahme, Kommission). Bei Spenden wird der Spender als Kontakt
          hinterlegt. Die Spendenquittung wird dann mit einem Klick generiert —
          mit allen Pflichtangaben vorausgefüllt, druckbereit als PDF.
        </P>
        <P>
          Achtung: Kivvi kann die rechtliche Prüfung nicht ersetzen. Für Ihre
          spezifische Situation — insbesondere wenn Ihre Organisation sehr
          grosse Spendenbeträge erhält — empfehlen wir eine Rücksprache mit
          Ihrer Treuhandstelle oder dem kantonalen Steueramt.
        </P>
      </Section>
    </>
  );
}

function KivitendoMigrationArticle() {
  return (
    <>
      <Section title="Warum jetzt wechseln?">
        <P>
          Kivitendo ist ein solides Open-Source-ERP — aber es wurde für
          klassischen Handel gebaut, nicht für Kreislaufwirtschaft.
          Einzelartikel- Tracking, Zustandsbewertung,
          Reparaturkosten-Akkumulation, Impact-Kennzahlen: das alles braucht man
          in Kivitendo als Workarounds oder Excel-Ergänzung.
        </P>
        <P>
          Kivvi übernimmt Ihre Daten vollständig: Kontakte, Artikel, offene
          Rechnungen, Buchungshistorie. Die Migration ist selbst durchführbar —
          CSV-Export aus Kivitendo, CSV-Import in Kivvi, fertig.
        </P>
      </Section>

      <Section title="Was wird importiert?">
        <div className="space-y-3">
          {[
            {
              what: "Kunden & Lieferanten",
              detail:
                "Name, Adresse, Kundennummer, E-Mail, Zahlungsbedingungen",
              status: "Vollständig",
              color: "text-green-700 dark:text-green-400",
            },
            {
              what: "Artikel & Leistungen",
              detail: "Artikelnummer, Bezeichnung, Preis, Warengruppe, Einheit",
              status: "Vollständig",
              color: "text-green-700 dark:text-green-400",
            },
            {
              what: "Offene Rechnungen (AR)",
              detail: "Rechnungsnummer, Betrag, Fälligkeit, Kunde",
              status: "Vollständig",
              color: "text-green-700 dark:text-green-400",
            },
            {
              what: "Eingangsrechnungen (AP)",
              detail: "Belegnummer, Betrag, Lieferant, Fälligkeit",
              status: "Vollständig",
              color: "text-green-700 dark:text-green-400",
            },
            {
              what: "Buchungssätze",
              detail: "Datum, Konto, Gegenkonto, Betrag, Buchungstext",
              status: "Vollständig",
              color: "text-green-700 dark:text-green-400",
            },
            {
              what: "Lagerbestand",
              detail: "Artikel, Menge, Lager — aber keine Einzelartikel-IDs",
              status: "Summiert (keine Seriennummern)",
              color: "text-amber-700 dark:text-amber-400",
            },
            {
              what: "Dokumente / Anhänge",
              detail: "PDF-Rechnungen, Belege",
              status: "Nicht importierbar — extern archivieren",
              color: "text-muted-foreground",
            },
          ].map((r) => (
            <div
              key={r.what}
              className="grid sm:grid-cols-3 gap-2 rounded-xl border p-4 text-sm"
            >
              <div className="font-medium">{r.what}</div>
              <div className="text-muted-foreground">{r.detail}</div>
              <div className={`font-medium ${r.color}`}>{r.status}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Schritt für Schritt: Export aus Kivitendo">
        <P>
          Kivitendo exportiert über Berichte und den integrierten CSV-Export.
          Gehen Sie in der folgenden Reihenfolge vor — die Reihenfolge ist
          wichtig wegen Abhängigkeiten (Rechnungen brauchen Kunden und Artikel).
        </P>
        <div className="space-y-3">
          {[
            {
              step: "1",
              title: "Kunden exportieren",
              path: "Stammdaten → Kunden → Liste → CSV-Export",
              note: "Alle Felder aktivieren; insbesondere Kundennummer, Zahlungsziel, Steuernummer",
            },
            {
              step: "2",
              title: "Lieferanten exportieren",
              path: "Stammdaten → Lieferanten → Liste → CSV-Export",
              note: "Gleiche Vorgehensweise wie Kunden",
            },
            {
              step: "3",
              title: "Artikel exportieren",
              path: "Stammdaten → Artikel → Liste → CSV-Export",
              note: "Warengruppen werden als Text exportiert — Kivvi erstellt sie automatisch beim Import",
            },
            {
              step: "4",
              title: "Offene Rechnungen exportieren",
              path: "Debitorenbuchhaltung → Berichte → Offene Posten → CSV",
              note: "Nur offene Posten — bereits bezahlte Rechnungen brauchen Sie in der Regel nicht zu migrieren",
            },
            {
              step: "5",
              title: "Buchungsjournal exportieren (optional)",
              path: "Finanzbuchhaltung → Buchungsjournal → CSV",
              note: "Für Jahresvergleiche sinnvoll; nicht zwingend für den laufenden Betrieb",
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-4 rounded-xl border p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {s.step}
              </div>
              <div>
                <div className="font-semibold mb-1">{s.title}</div>
                <div className="text-sm text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1 mb-1">
                  {s.path}
                </div>
                <div className="text-sm text-muted-foreground">{s.note}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Schritt für Schritt: Import in Kivvi">
        <P>
          Nach dem Onboarding (Firmendaten, Kontenrahmen, Nummernkreise) finden
          Sie unter Einstellungen → Datenimport den CSV-Importassistenten. Kivvi
          erkennt Kivitendo-Exporte automatisch und schlägt die richtigen
          Spaltenzuordnungen vor.
        </P>
        <div className="rounded-xl border bg-card p-6 text-sm space-y-3">
          <div className="font-medium mb-3">
            Importreihenfolge (zwingend einhalten)
          </div>
          {[
            "Kunden und Lieferanten",
            "Warengruppen und Hersteller (werden automatisch aus Artikeln erzeugt)",
            "Artikel",
            "Offene Rechnungen und Eingangsrechnungen",
            "Buchungsjournal (optional)",
            "Lagerbestand",
          ].map((item, i) => (
            <div key={item} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
        <P>
          Kivvi übernimmt nach dem Import automatisch die höchsten bestehenden
          Nummern und setzt die Nummernkreise entsprechend fort. Ihre erste neue
          Rechnung bekommt die nächste freie Nummer — nahtlos.
        </P>
      </Section>

      <Section title="Nach dem Import">
        <P>
          Prüfen Sie nach dem Import stichprobenartig: 3 Kunden, 3 Artikel, 2
          offene Rechnungen. Stimmen Adresse, Preis und Betrag? Wenn ja, ist die
          Migration erfolgreich.
        </P>
        <P>
          Tipp: Behalten Sie Kivitendo für 30 Tage parallel aktiv — nur im
          Lesemodus. Führen Sie ab Migrationsstichtag alle neuen Transaktionen
          in Kivvi. So haben Sie im Zweifelsfall eine Vergleichsquelle, ohne
          Daten doppelt zu pflegen.
        </P>
      </Section>
    </>
  );
}

function PreisgestaltungSecondhandArticle() {
  return (
    <>
      <Section title="Das Dilemma der Preisgestaltung">
        <P>
          Bei Neuware ist der Preis einfach: Einkaufspreis + Marge =
          Verkaufspreis. Bei Gebrauchtware gibt es keinen Einkaufspreis — oder
          er ist null (Spende). Dafür gibt es eine Kostenbasis: Reparatur,
          Reinigung, Bewertungsaufwand. Und es gibt einen Marktpreis — aber
          keinen fixen, sondern eine Bandbreite.
        </P>
        <P>
          Viele Betriebe lösen das mit Bauchgefühl. Das führt zu Inkonsistenzen:
          Der gleiche Laptop kostet CHF 180 oder CHF 240 je nachdem, wer ihn
          bewertet hat. Kunden bemerken das — und es untergräbt das Vertrauen.
        </P>
      </Section>

      <Section title="Methoden der Preisfindung">
        <div className="space-y-4">
          {[
            {
              method: "Marktpreis-Abschlag",
              description:
                "Recherchieren Sie Vergleichspreise auf Ricardo, Tutti oder eBay. Setzen Sie Ihren Preis 10–20% darunter als Wettbewerbsvorteil.",
              good: "Marktgerecht, rechtfertigbar",
              bad: "Aufwändig ohne Automatisierung; Markt schwankt",
              forWhat:
                "IT-Geräte, Velos — überall wo Ricardo-Preise existieren",
            },
            {
              method: "Neupreis-Abschlag nach Zustand",
              description:
                "Recherchieren Sie den aktuellen Neupreis. Gut = 60–70%, Mittel = 40–55%, Schlecht = 20–35%.",
              good: "Einfach kommunizierbar («60% des Neupreises»)",
              bad: "Funktioniert nicht bei Waren ohne klaren Neupreis (Vintage, Antiquitäten)",
              forWhat: "Markenware, aktuelle Elektronik",
            },
            {
              method: "Kostenbasis + Marge",
              description:
                "Reparaturkosten + Bewertungsaufwand (pauschal CHF 5–15 pro Stück) + Zielrendite (z.B. 40%). Gilt auch bei Gratisware.",
              good: "Kostendeckend, unabhängig vom Markt",
              bad: "Kann über Marktpreis liegen; braucht konsequente Zeiterfassung",
              forWhat: "Reparierte Artikel, Nischenware",
            },
            {
              method: "Kategoriebasierte Richtpreise",
              description:
                "Definieren Sie intern Preisbänder pro Kategorie und Zustand: z.B. Laptop Gut: CHF 150–300, Mittel: CHF 80–150. Verkaufsperson entscheidet im Band.",
              good: "Schnell, konsistent, kein Rechercheaufwand",
              bad: "Muss regelmässig aktualisiert werden (Markt verändert sich)",
              forWhat: "Hochvolumenbetriebe, Kleidung, Möbel",
            },
          ].map((m) => (
            <div key={m.method} className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-2">{m.method}</h3>
              <P>{m.description}</P>
              <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
                  <span className="font-medium text-green-800 dark:text-green-200">
                    Stärke:
                  </span>{" "}
                  <span className="text-green-700 dark:text-green-300">
                    {m.good}
                  </span>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3">
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    Schwäche:
                  </span>{" "}
                  <span className="text-amber-700 dark:text-amber-300">
                    {m.bad}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium">Geeignet für:</span> {m.forWhat}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Reparaturkosten einkalkulieren">
        <P>
          Reparaturkosten sind die unsichtbare Kostenbasis bei gespendeten
          Waren. Ein Laptop, der kostenlos gespendet wurde, aber CHF 60
          Reparaturkosten hatte (Akku + Reinigung), hat eine Kostenbasis von CHF
          60 — nicht null.
        </P>
        <P>
          Empfehlung: Erfassen Sie Reparaturkosten pro Artikel konsequent.
          Setzen Sie eine Mindestmarge (z.B. 30% über Kostenbasis). Der
          Richtpreis kann höher liegen — der Mindestpreis nicht unterschreiten.
        </P>
        <div className="rounded-xl border bg-card p-5 font-mono text-sm">
          <div className="space-y-1 text-muted-foreground">
            <div>Kostenbasis: CHF 60 (Reparatur + Materialien)</div>
            <div>Mindestpreis: CHF 60 × 1.30 = CHF 78</div>
            <div>
              Richtpreis: CHF 140 (Markt: Gut-Laptop dieser Klasse ~CHF 160)
            </div>
            <div className="border-t pt-2 mt-2 text-foreground font-medium">
              Ergebnis: CHF 78–160, abhängig von Zustand und Nachfrage
            </div>
          </div>
        </div>
      </Section>

      <Section title="Sozialrabatte: Wann und wie?">
        <P>
          Viele Kreislaufbetriebe bieten Rabatte für einkommensschwache Kunden
          an. Das ist eine Stärke — aber es braucht klare Regeln, damit es keine
          Willkür wird.
        </P>
        <div className="space-y-3">
          {[
            {
              rule: "Klare Berechtigung",
              detail:
                "Wer bekommt den Rabatt? AHV-Ausweis, Sozialhilfe-Bestätigung, Lernendenstatus? Schreiben Sie es auf.",
            },
            {
              rule: "Fixer Rabattsatz",
              detail:
                "Z.B. 20% auf alle Artikel. Kein Verhandeln — das kostet Zeit und schafft Ungleichheit.",
            },
            {
              rule: "Mindestpreis respektieren",
              detail:
                "Sozialrabatt darf nicht unter die Kostenbasis führen. Der Mindestpreis gilt auch für rabattierte Verkäufe.",
            },
            {
              rule: "Dokumentation",
              detail:
                "Halten Sie den Rabattgrund im Verkaufsbeleg fest — für interne Auswertungen und Förderberichte.",
            },
          ].map((r) => (
            <div key={r.rule} className="flex gap-3 text-sm">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div>
                <span className="font-medium">{r.rule}: </span>
                <span className="text-muted-foreground">{r.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Mit Kivvi Preise verwalten">
        <P>
          In Kivvi hinterlegen Sie pro Artikel einen Richtpreis und optional
          einen Mindestpreis. Die Verkaufsperson sieht beides beim Erstellen
          eines Belegs und kann den Preis innerhalb des Rahmens anpassen.
        </P>
        <P>
          Über Preislisten können Sie Sozialrabatte oder Kundengruppen-Rabatte
          systemweit definieren. Statt jedem Artikel einen manuellen Rabatt zu
          geben, weisen Sie dem Kunden einfach die entsprechende Preisliste zu —
          und Kivvi rechnet automatisch korrekt.
        </P>
      </Section>
    </>
  );
}

function QrRechnungSchweizArticle() {
  return (
    <>
      <Section title="Was ist die QR-Rechnung?">
        <P>
          Die QR-Rechnung ersetzt seit 2022 den roten und orangen
          Einzahlungsschein vollständig. Sie besteht aus der eigentlichen
          Rechnung (Papier oder PDF) und einem standardisierten
          QR-Einzahlungsschein (Empfangsschein + Zahlteil).
        </P>
        <P>
          Der QR-Code enthält alle Zahlungsinformationen maschinenlesbar: IBAN,
          Empfänger, Betrag, Referenznummer. Banken und Buchhaltungssoftware
          können eingehende Zahlungen damit automatisch zuordnen — das spart
          erheblichen manuellen Abgleichsaufwand.
        </P>
      </Section>

      <Section title="Wer braucht sie?">
        <P>
          Jedes Schweizer Unternehmen, das Rechnungen an andere Unternehmen oder
          Privatkunden stellt, sollte QR-Rechnungen ausstellen. Es gibt keine
          gesetzliche Pflicht für eine Mindestsumme — aber de facto ist es der
          Standard. Ohne QR-Slip können viele Kunden die Zahlung nicht mehr
          digital verarbeiten.
        </P>
        <div className="rounded-xl border bg-card p-5 text-sm space-y-2">
          {[
            {
              situation: "Einzelhandel, Barzahlung",
              needsQr: "Nein — Kassenbon reicht",
            },
            {
              situation: "Rechnung an Privatperson (Zahlungsziel 30 Tage)",
              needsQr: "Ja — QR-Slip dringend empfohlen",
            },
            {
              situation: "Rechnung an Firmenkunden",
              needsQr: "Ja — ohne QR oft Verarbeitungsprobleme beim Kunden",
            },
            {
              situation: "Kleinbetragsrechnungen unter CHF 1",
              needsQr:
                "Technisch nicht unterstützt — aber solche Rechnungen sind sowieso unüblich",
            },
          ].map((r) => (
            <div
              key={r.situation}
              className="flex items-start justify-between gap-4"
            >
              <span className="text-muted-foreground">{r.situation}</span>
              <span
                className={`shrink-0 font-medium ${
                  r.needsQr.startsWith("Ja")
                    ? "text-green-700 dark:text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                {r.needsQr}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Pflichtangaben">
        <P>
          Der QR-Code auf der Rechnung muss folgende Felder enthalten — alle
          anderen Felder sind optional:
        </P>
        <div className="rounded-xl border bg-card overflow-hidden text-sm">
          <div className="divide-y">
            {[
              {
                field: "IBAN",
                note: "Schweizer oder Liechtensteinisches Konto (CH.. oder LI..)",
              },
              {
                field: "Empfänger (Name + Adresse)",
                note: "Exakt wie auf dem Bankkonto registriert",
              },
              {
                field: "Betrag",
                note: "Optional — kann auch leer bleiben (Betrag offen)",
              },
              { field: "Währung", note: "Nur CHF oder EUR" },
              {
                field: "QR-Referenz oder SCOR-Referenz",
                note: "Für automatische Zahlungszuordnung — dringend empfohlen",
              },
              {
                field: "Zusatzinformationen (Unstrukturiert)",
                note: "Z.B. Rechnungsnummer, max. 140 Zeichen — optional",
              },
            ].map((f) => (
              <div
                key={f.field}
                className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x"
              >
                <div className="px-5 py-3 font-medium">{f.field}</div>
                <div className="px-5 py-3 text-muted-foreground">{f.note}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="MWST bei Kreislaufbetrieben">
        <P>
          Die Mehrwertsteuer spielt bei Kreislaufbetrieben eine besondere Rolle.
          Gespendete Waren haben keine Vorsteuerbasis — Sie zahlen beim Eingang
          keine MWST und können daher auch keine Vorsteuer abziehen. Das
          bedeutet: Der gesamte Verkaufserlös ist MWST-pflichtig (kein Abzug).
        </P>
        <P>
          Für Vereine und gemeinnützige Organisationen: Die MWST-Pflicht gilt ab
          CHF 100&apos;000 Jahresumsatz. Unter dieser Schwelle sind Sie nicht
          steuerpflichtig — müssen aber auch keine Vorsteuer geltend machen. Auf
          der Rechnung erscheint dann kein MWST-Betrag und keine Steuernummer.
        </P>
        <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 p-5 text-sm">
          <div className="font-medium text-amber-800 dark:text-amber-200 mb-2">
            Wichtig: Margenbesteuerung
          </div>
          <p className="text-amber-700 dark:text-amber-300">
            Händler, die gebrauchte Waren von Privatpersonen kaufen (nicht
            geschenkt bekommen), können unter bestimmten Bedingungen die
            Margenbesteuerung anwenden: MWST wird nur auf die Marge
            (Verkaufspreis minus Einkaufspreis) erhoben. Für Kreislaufbetriebe
            mit Spenden-Intake ist dies in der Regel nicht anwendbar. Bei
            Unsicherheit: Rücksprache mit dem kantonalen Steueramt.
          </p>
        </div>
      </Section>

      <Section title="Rappen-Rundung: CHF 0.05">
        <P>
          In der Schweiz werden CHF-Beträge auf 5 Rappen gerundet (0.00, 0.05,
          0.10, ...). Das gilt für den Gesamtbetrag auf der Rechnung, nicht für
          einzelne Positionen. Die Rundungsdifferenz ist als separate Position
          oder als Fussnote auszuweisen.
        </P>
        <div className="rounded-xl border bg-card p-5 font-mono text-sm space-y-1">
          <div className="text-muted-foreground">Laptop CHF 189.00</div>
          <div className="text-muted-foreground">MWST 8.1% CHF 15.31</div>
          <div className="text-muted-foreground">Zwischentotal CHF 204.31</div>
          <div className="text-muted-foreground">Rundung CHF +0.04</div>
          <div className="border-t pt-2 mt-2 font-medium text-foreground">
            Gesamtbetrag CHF 204.35
          </div>
        </div>
        <P>
          Kivvi berechnet die Rappen-Rundung automatisch und weist sie korrekt
          aus. Sie müssen nichts manuell adjustieren.
        </P>
      </Section>

      <Section title="Kivvi automatisiert QR-Rechnungen">
        <P>
          Jede Rechnung in Kivvi generiert automatisch einen gültigen
          QR-Einzahlungsschein. Die Referenznummer wird aus Firmennummer und
          Rechnungsnummer gebildet — eindeutig und maschinenlesbar. Die IBAN
          kommt aus Ihren Bankkonten- Einstellungen.
        </P>
        <P>
          Der PDF-Export enthält Rechnung und QR-Slip auf einer Seite, direkt
          druckfertig. Bei digitaler Zustellung reicht der PDF-Anhang — der
          Kunde kann den QR-Code mit seiner Banking-App einlesen und mit einem
          Klick zahlen.
        </P>
      </Section>
    </>
  );
}
