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
