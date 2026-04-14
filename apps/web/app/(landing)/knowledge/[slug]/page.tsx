import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { KNOWLEDGE_ARTICLES } from "@/lib/content/knowledge-articles";

// ============================================================
// Article content registry
// Maps slug → JSX content component.
// Metadata (title, tag, readTime, lead, sections) lives in
// lib/content/knowledge-articles.ts (SSOT).
// To add an article: add metadata there, add content here.
// ============================================================

// slug → JSX content only. All metadata lives in knowledge-articles.ts (SSOT).
const ARTICLE_CONTENT: Record<string, React.ReactNode> = {
  "kreislaufwirtschaft-software-problem": (
    <KreislaufwirtschaftSoftwareProblemArticle />
  ),
  zustandsbewertung: <ZustandsbewertungArticle />,
  "impact-messen": <ImpactMessenArticle />,
  spendenquittungen: <SpendenquittungenArticle />,
  "kivitendo-migration": <KivitendoMigrationArticle />,
  "preisgestaltung-secondhand": <PreisgestaltungSecondhandArticle />,
  "qr-rechnung-schweiz": <QrRechnungSchweizArticle />,
  "it-refurbisher": <ItRefurbisherArticle />,
  brockenhaus: <BrockenhausArticle />,
  "vintage-fachhandel": <VintageFachhandelArticle />,
  reparaturwerkstatt: <ReparaturwerkstattArticle />,
  revampit: <RevampItArticle />,
  velofachhandel: <VelofachhandelArticle />,
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
  return KNOWLEDGE_ARTICLES.filter((a) => a.published).map((a) => ({
    slug: a.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = KNOWLEDGE_ARTICLES.find((a) => a.slug === slug);
  if (!meta) return {};
  return {
    title: `${meta.title} — Kivvi Wissensdatenbank`,
    description: meta.lead,
  };
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = KNOWLEDGE_ARTICLES.find((a) => a.slug === slug);
  const content = ARTICLE_CONTENT[slug];
  if (!meta || !content) notFound();

  const currentIndex = KNOWLEDGE_ARTICLES.indexOf(meta);
  const nextMeta =
    currentIndex >= 0 ? KNOWLEDGE_ARTICLES[currentIndex + 1] : undefined;

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
              {meta.tag}
            </span>
            <span className="text-xs text-muted-foreground">
              {meta.readTime} Lesezeit
            </span>
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {meta.title}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {meta.lead}
          </p>
        </div>

        {/* Table of contents */}
        <nav className="mb-10 rounded-xl border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inhalt
          </p>
          <ol className="space-y-1.5">
            {meta.sections.map((section, i) => (
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
          {content}
        </div>

        {/* Next article */}
        {nextMeta && (
          <div className="mt-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nächster Artikel
            </p>
            <Link
              href={`/knowledge/${nextMeta.slug}`}
              className="group flex items-center justify-between rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {nextMeta.tag}
                </span>
                <h3 className="mt-2 font-semibold group-hover:text-primary transition-colors">
                  {nextMeta.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {nextMeta.lead}
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

function KreislaufwirtschaftSoftwareProblemArticle() {
  return (
    <>
      <Section title="Was ein Kreislaufbetrieb wirklich tut">
        <p>
          Um die Software-Lücke zu verstehen, muss man zunächst verstehen, was
          der Betrieb eines Reparatur-, Refurbishing- oder Secondhand-Betriebs
          tatsächlich beinhaltet — denn er unterscheidet sich grundlegend von
          dem, was jedes bestehende ERP zu handhaben gedacht ist.
        </p>
        <p>
          Ein linearer Betrieb kauft Waren zu bekanntem Zustand und Preis ein,
          verkauft sie und verwaltet den Bestand als Mengen. Das ERP zählt
          Einheiten und erstellt Rechnungen.
        </p>
        <p>
          Ein Kreislaufbetrieb tut etwas grundlegend anderes. Er nimmt Waren
          unbekannten Zustands, unbekannter Herkunft und unbekannten Werts an.
          Eine Spende kommt herein. Es könnte ein funktionstüchtiger Laptop
          sein, ein defekter — oder etwas dazwischen. Bevor er verkauft werden
          kann, muss er bewertet werden: Wie ist der Akkuzustand? Besteht der
          Speicher den SMART-Diagnosetest? Wurden Daten sicher gelöscht? Welchen
          Zustandsgrad erhält er — wie neu, gut, mittel, schlecht oder nur für
          Teile?
        </p>
        <p>
          Dann muss möglicherweise repariert werden. Die Reparatur hat Kosten.
          Die Reparatur hat Stunden. Sie kann gelingen oder scheitern. Ein
          Gerät, das die Reparatur nicht besteht, wird zur Teilegewinnung oder
          zum Recycling weitergeleitet statt in den Verkauf.
        </p>
        <p>
          Erst nach all dem beginnt die klassische ERP-Geschichte: Preis
          festlegen, inserieren, verkaufen, Rechnung ausstellen.
        </p>
        <p>
          Das bestehende Software-Ökosystem beherrscht die letzten drei Schritte
          gut. Die ersten sieben — Intake, Zustandsbewertung, Testing, Routing,
          Reparatur, Datenlöschung, Nachtesting — werden durch
          Tabellenkalkulationen, Papierformulare und institutionelles Gedächtnis
          abgedeckt.
        </p>
      </Section>

      <Section title="Warum jede bestehende ERP-Lösung scheitert">
        <p>
          Die ERP-Anbieter der Welt haben diesen Workflow weitgehend nicht
          adressiert — jeder aus strukturellen Gründen.
        </p>
        <p>
          <strong>Bexio</strong> ist das dominierende Schweizer
          KMU-Buchhaltungsprodukt mit über 100.000 Betrieben und 1.300
          zertifizierten Treuhänderpartnern. Für einen Schweizer
          Dienstleistungs- oder Einzelhandelsbetrieb ist es hervorragend. Aber
          es kennt kein Einzelartikel-Tracking — der Bestand wird als fungible
          Mengen verwaltet. Ein Brockenhaus, das 500 gespendete Artikel
          unterschiedlichen Zustands verwaltet, kann diese nicht auf
          Artikelebene unterscheiden. Kein Zustandsgrad, keine
          Reparaturhistorie, kein individueller Artikellebenszyklus.
        </p>
        <p>
          <strong>Odoo</strong> kommt in der Allzweck-Kategorie am nächsten. Es
          hat ein Reparaturmodul, das Teile-Ein und -Aus, Arbeitskosten und
          Gerätehistorie abdeckt. Aber das Modul geht von einem bekannten
          Produkt aus, das gegen einen bekannten Reparaturauftrag repariert wird
          — es gibt kein Intake unbekannter Zustandsgeräte, keine
          checklisten-basierte Testworkflow, keine Zustandsklassifikation und
          keine Routing-Logik. Solche Workflows auf Odoo aufzubauen kostet CHF
          50.000–150.000 an Customizing.
        </p>
        <p>
          <strong>Kivitendo</strong> — das in der Schweiz und Deutschland
          verbreitete Open-Source-ERP — ist die einem funktionierenden System am
          nächsten kommende Lösung. Es hat ausgereifte Buchhaltung,
          Einkaufsworkflows und QR-Rechnungsunterstützung. Aber es hat keine
          Zustandsklassifikation, keine checklisten-basierte Prüfung, keine
          Reparaturwarteschlange, keinen individuellen Artikellebenszyklus.
        </p>
        <p>
          Die Reparatursoftware-Kategorie (RepairShopr, Fixably) deckt die Mitte
          des Workflows gut ab: Intake-Tickets, Technikerenzuweisung,
          Teile-Tracking. Aber diese Tools sind keine ERPs. Sie erstellen keine
          QR-Rechnungen, führen keine doppelte Buchführung, kennen kein
          Differenzbesteuerungsverfahren für Gebrauchwaren und erstellen keine
          Bilanzen.
        </p>
        <p>Niemand hat diese Teile verbunden.</p>
      </Section>

      <Section title="Das regulatorische Fenster">
        <p>
          Diese Software-Lücke war bereits ein Problem. Sie wird jetzt zu einem
          dringenden Problem — wegen drei sich überlagernder regulatorischer
          Veränderungen.
        </p>
        <p>
          <strong>Die EU-Reparierbarkeitsrichtlinie (2024/1799)</strong> trat am
          30. Juli 2024 in Kraft; die Umsetzung durch die Mitgliedstaaten muss
          bis zum 31. Juli 2026 erfolgen. Sie verpflichtet Hersteller von
          Smartphones, Laptops, Waschmaschinen und anderen Produkten,
          Ersatzteile zu angemessenen Preisen innerhalb von 15 Tagen verfügbar
          zu machen — für 7 bis 10 Jahre nach dem letzten Produktionsdatum.
        </p>
        <p>
          Die strukturelle Wirkung ist klar: mehr Geräte werden repariert.
          Ersatzteile, die bisher nicht verfügbar oder zu teuer waren, werden
          gesetzlich vorgeschrieben. Der Markt für unabhängige Reparaturen wird
          wachsen. Organisationen, die bereits in diesem Bereich tätig sind —
          Reparaturcafés, Refurbisher, Brockenhäuser — werden mehr Volumen
          verarbeiten und höheren Qualitätsanforderungen gegenüberstehen.
        </p>
        <p>
          Höheres Volumen erfordert bessere Betriebssoftware. &quot;Wir benutzen
          Tabellenkalkulationen&quot; ist nicht skalierbar.
        </p>
        <p>
          <strong>Die EU-ESPR-Verordnung (2024/1781)</strong> führt den
          Digitalen Produktpass ein — einen maschinenlesbaren Datensatz für
          jedes in der EU verkaufte Produkt, der Materialzusammensetzung,
          CO₂-Fussabdruck, Reparaturhistorie, Ersatzteilversorgung und
          Entsorgungshinweise enthält. Der DPP muss während des gesamten
          Produktlebens aktualisiert werden — auch durch Reparatur- und
          Aufbereitungsereignisse. Für Elektronik-Produkte gilt die
          DPP-Anforderung ab 2028–2029.
        </p>
        <p>
          Das ist strukturell ein ERP-Problem. Ein Refurbisher, der ein Gerät
          empfängt, testet, repariert und verkauft, muss diese Handlungen so
          protokollieren, dass der DPP des Geräts aktualisiert wird. Das ist
          keine Tabellenkalkulationsfunktion. Es ist eine Datenbankfunktion —
          verbunden mit einem Versorgungskettenprotokoll, nach Seriennummer
          nachverfolgbar, mit Zeitstempel und verantwortlicher Partei.
        </p>
        <p>
          <strong>Das nDSG</strong> — das neue Schweizer Datenschutzgesetz, in
          Kraft seit September 2023 — schafft explizite rechtliche Haftung für
          Organisationen, die Gebrauchtgeräte mit personenbezogenen Daten
          verarbeiten. Ein Factory-Reset ist rechtlich nicht ausreichend.
          Organisationen müssen überprüfbare Datenlöschungszertifikate nach
          Standards wie NIST SP 800-88 oder DIN 66399 vorweisen. Unter dem nDSG
          können einzelne Manager und Direktoren persönlich mit bis zu CHF
          250.000 für vorsätzliche Verletzungen gebüsst werden.
        </p>
      </Section>

      <Section title="Der Impact, der sich nicht messen lässt">
        <p>
          Kreislaufwirtschaftsorganisationen haben eine Geschichte zu erzählen,
          die kein ERP derzeit hilft, zu erzählen.
        </p>
        <p>
          Ein aufbereiteter Laptop erzeugt 6,34% der CO₂-Emissionen eines neuen
          Geräts — laut einer von Cranfield University in Auftrag gegebenen
          Studie für Circular Computing. Jedes aufbereitete Gerät spart ungefähr
          316 kg CO₂-Äquivalent und 190.000 Liter Wasser. Ein aufbereitetes
          Smartphone erzeugt 91,6% weniger CO₂ als ein neues.
        </p>
        <p>
          Diese Zahlen sind nicht klein. Sie sind real, messbar und werden
          zunehmend von Fördergebern, Spendern, Kunden und Regulatoren
          gefordert. Die Schweiz plant, CSRD-ähnliche
          Nachhaltigkeitsberichtspflichten auf etwa 3.500 Unternehmen
          auszuweiten — wirksam ab Januar 2026. Organisationen in der
          Kreislaufwirtschaft werden gebeten werden, ihren Impact nachzuweisen,
          nicht nur zu beschreiben.
        </p>
        <p>
          Kein bestehendes ERP berechnet CO₂-Einsparungen pro verkauftem
          Artikel. Keines aggregiert Reparaturerfolgsraten nach Gerätekategorie.
          Keines erstellt Impact-Berichte neben Finanzberichten. Das Restart
          Project, das über 208.000 Reparaturversuche in 31 Ländern
          protokolliert hat, nutzt ein separates Open-Source-Tool — genau weil
          kein ERP diese Daten unterstützt.
        </p>
        <p>
          Ein impact-natives ERP würde CO₂e-Einsparungen automatisch berechnen —
          unter Verwendung veröffentlichter Lebenszyklusanalysedaten — zum
          Zeitpunkt des Verkaufs. Es würde eine spendengerichtete Quittung
          erzeugen, die lautet: &quot;Die 3 Laptops, die Sie letzten Monat
          gespendet haben, wurden repariert und verkauft. Zusammen haben sie 948
          kg CO₂e vermieden — entsprechend 6.000 km Fahren.&quot;
        </p>
        <p>Diese Quittung existiert heute nicht.</p>
      </Section>

      <Section title="Was gute Software für diesen Bereich bedeutet">
        <p>
          Die Anforderungen sind nicht exotisch. Sie sind spezifisch und aus
          ersten Prinzipien ableitbar:
        </p>
        <ul>
          <li>
            <strong>Einzelartikel-Tracking als Grundlage.</strong> Jeder
            Artikel, der in die Organisation kommt, hat eine einzigartige
            Identität — eine Artikelnummer, einen Zustandsgrad, eine Geschichte.
          </li>
          <li>
            <strong>Strukturierte, konsistente Zustandsklassifikation.</strong>
            &quot;Gut&quot; bedeutet etwas Spezifisches: sichtbare
            Gebrauchsspuren, 80%+ Akkukapazität. &quot;Wie neu&quot; bedeutet
            etwas anderes. Die Klassifikation muss gegen einen definierten
            Standard erfolgen, konsistent über Techniker und Zeit hinweg.
          </li>
          <li>
            <strong>
              Checklisten-gesteuertes, kategoriespezifisches Testing.
            </strong>
            Eine Laptop-Checkliste ist nicht dieselbe wie eine
            Fahrrad-Checkliste. Was getestet wurde, was bestanden hat, was
            nicht, wer wann getestet hat.
          </li>
          <li>
            <strong>Erzwungene Qualitätsgates.</strong> Ein Artikel mit einem
            fehlgeschlagenen Speicher-SMART-Test sollte nicht für den Verkauf
            freigegeben werden können. Ein Artikel ohne bestätigte Datenlöschung
            sollte nicht verkäuflich sein. Diese sind keine Erinnerungen — sie
            sind strukturelle Beschränkungen.
          </li>
          <li>
            <strong>Reparaturkosten-Tracking auf Artikelebene.</strong> Wenn ein
            Techniker 2,5 Stunden und CHF 40 für Teile aufwendet, muss dieser
            Aufwand an genau diesen Artikel gebunden sein. Die Marge beim
            Verkauf wird gegen Anschaffungskosten plus Reparaturkosten
            berechnet.
          </li>
          <li>
            <strong>Schweizer Compliance nativ, nicht als Plugin.</strong>
            QR-Rechnung, Rappen-Rundung, Schweizer MWST-Sätze inklusive
            Margenbesteuerung für Gebrauchwaren, 10-jährige
            Dokumentenaufbewahrung nach OR Art. 958f.
          </li>
          <li>
            <strong>Impact als erstklassige Daten.</strong> CO₂ eingespart pro
            Gerät, Reparaturerfolgsquote nach Kategorie, Geräte aus dem
            Recycling gerettet — diese Zahlen sollten abfragbar, berichtsfähig
            und teilbar sein ohne Datenexport.
          </li>
        </ul>
      </Section>

      <Section title="Die Chance">
        <p>
          Die Schweiz hat 609+ Brockenhäuser. Sie hat eine Regierung, die CHF 12
          Millionen zur Unterstützung von Kreislaufwirtschaftsorganisationen
          zugesagt hat. Sie hat eine der höchsten Pro-Kopf-Elektroschrottquoten
          Europas und eine Infrastruktur durch SENS und SWICO, die jährlich
          121.000 Tonnen verarbeitet.
        </p>
        <p>
          Europaweit hat Back Market 2.700 Refurbisher-Partner, die EUR 3
          Milliarden GMV erwirtschaften — jeder davon verwaltet seinen
          operativen Workflow ausserhalb jedes integrierten Systems.
        </p>
        <p>
          Die EU-Reparierbarkeitsrichtlinie tritt im Juli 2026 in Kraft und wird
          den Reparaturmarkt strukturell ausweiten. Die Anforderung an den
          Digitalen Produktpass schafft eine Datenmanagementpflicht für jede
          Organisation, die Gebrauchtelektronik verarbeitet. Das Schweizer nDSG
          schafft persönliche Haftung für Datenlöschungsversäumnisse.
        </p>
        <p>
          Der Markt ist real. Die Regulierung kommt. Die Software existiert
          nicht.
        </p>
        <p>
          Das ist die Definition eines Problems, das es sich zu lösen lohnt.
        </p>
      </Section>
    </>
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

function ItRefurbisherArticle() {
  return (
    <>
      <Section title="Wer sind IT-Refurbisher?">
        <P>
          IT-Refurbisher nehmen ausgemusterte Geräte von Unternehmen, Schulen
          und Privatpersonen entgegen — Laptops, Desktops, Monitore, Drucker,
          Tablets — und bereiten sie für ein zweites Leben auf. In der Schweiz
          operieren die meisten als gemeinnützige Vereine: revamp-it in Zürich,
          Büro Mühle in Horw, Coopi in Bern. Einige sind als GmbH organisiert,
          andere arbeiten im Rahmen von Integrationsprogrammen.
        </P>
        <P>
          Das Kernangebot ist zweigeteilt: Geräte werden zu fairen Preisen
          verkauft — oft an einkommensschwache Haushalte, Schulen und NGOs in
          der Schweiz oder über Partner wie Linuxola in Entwicklungsländer
          versandt. Und Unternehmen, die ihre Geräte abgeben, erhalten
          Entsorgungsnachweis und Spendenquittung. IT-Refurbisher schliessen
          damit eine Lücke, die weder der reguläre Handel noch der Recyclinghof
          bedient.
        </P>
      </Section>

      <Section title="Die Menschen dahinter">
        <div className="space-y-4">
          {[
            {
              role: "Koordination / Geschäftsleitung",
              who: "1–2 Personen, oft bezahlt",
              does: "Betrieb steuern, Firmenpartnerschaften akquirieren, Finanzen, Fördermittel beantragen, Team führen",
            },
            {
              role: "Techniker / Refurbisher",
              who: "2–8 Personen, mix aus Fest- und Teilzeit",
              does: "Geräte testen, diagnostizieren, reparieren, Linux installieren, Qualitätskontrolle, Reparaturkosten dokumentieren",
            },
            {
              role: "Lager & Intake",
              who: "1–3 Personen, oft Praktikanten oder Freiwillige",
              does: "Geräte annehmen, erfassen, Zustand grob einschätzen, in die Testqueue einreihen",
            },
            {
              role: "Verkauf / Ausgabe",
              who: "1–2 Personen, oft Freiwillige",
              does: "Geräte ausgeben, Rechnungen erstellen, Kundenfragen beantworten",
            },
            {
              role: "Freiwillige",
              who: "5–30 Personen, unregelmässig",
              does: "Geräteannahme, Sortierung, einfache Tests, Reinigung — je nach Kenntnisstand",
            },
          ].map((r) => (
            <div key={r.role} className="rounded-xl border p-4 text-sm">
              <div className="font-semibold mb-1">{r.role}</div>
              <div className="text-xs text-muted-foreground mb-2">{r.who}</div>
              <div className="text-muted-foreground">{r.does}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Wie ein Gerät durch den Betrieb fliesst">
        <div className="space-y-2">
          {[
            {
              step: "1",
              label: "Annahme",
              detail:
                "Gerät kommt rein — von Firma, Privatperson oder Sammelaktion. Spendende werden erfasst, Spendenquittung wird ausgestellt oder angekündigt.",
            },
            {
              step: "2",
              label: "Triage",
              detail:
                "Kurze Sichtprüfung: Offensichtliche Schäden? Vollständig? Gerät erhält Kategorie und landet im Lager oder direkt in der Testqueue.",
            },
            {
              step: "3",
              label: "Test",
              detail:
                "Techniker überprüft Funktion: Display, Tastatur, Akku, RAM, Festplatte. Ergebnis: weiterverwenden, reparieren oder Teile/Schrott.",
            },
            {
              step: "4",
              label: "Reparatur",
              detail:
                "Defekte Teile werden ersetzt, Akku getauscht, Tastatur gereinigt. Reparaturkosten und Arbeitsstunden werden festgehalten.",
            },
            {
              step: "5",
              label: "Aufbereitung",
              detail:
                "Datenlöschung nach Datenschutzstandard, Linux-Installation (oft Ubuntu oder ähnlich), Grundkonfiguration, Reinigung.",
            },
            {
              step: "6",
              label: "Preisgebung",
              detail:
                "Preis basiert auf Modell, Alter, Zustand und Reparaturaufwand. Oft gibt es Richtpreislisten, aber Spielraum für Sozialrabatte.",
            },
            {
              step: "7",
              label: "Verkauf / Weitergabe",
              detail:
                "Direktverkauf im Laden, über Online-Plattformen, oder Weitergabe an Partnerorganisationen wie Schulen oder NGOs.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="flex gap-4 rounded-xl border p-4 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {s.step}
              </div>
              <div>
                <div className="font-semibold mb-0.5">{s.label}</div>
                <div className="text-muted-foreground">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Das Geschäftsmodell">
        <P>
          Die meisten IT-Refurbisher finanzieren sich aus mehreren Quellen:
          Geräteverkauf (oft 40–60% des Umsatzes), Entsorgungsgebühren von
          Unternehmen, die ihre Geräte fachgerecht loswerden wollen, und
          Fördergelder von Stiftungen oder der öffentlichen Hand.
        </P>
        <P>
          Margen sind dünn. Ein aufbereiteter Laptop bringt vielleicht CHF
          80–250, aber Arbeitszeit, Ersatzteile und Betriebskosten summieren
          sich schnell. Die wirtschaftliche Tragfähigkeit hängt direkt daran,
          wie effizient Geräte durch den Betrieb fliessen — und wie wenig Zeit
          mit Administration verloren geht.
        </P>
        <P>
          Förderanträge und Jahresberichte brauchen Impact-Zahlen: Geräte
          gerettet, CO₂ vermieden, Personen bedient. Wer diese Zahlen nicht
          automatisch aus dem System zieht, führt eine zweite Buchhaltung in
          Excel.
        </P>
      </Section>

      <Section title="Die grössten operativen Herausforderungen">
        <div className="space-y-3">
          {[
            {
              problem: "Kein System für den Gerätefluss",
              detail:
                "Intake, Test, Reparatur, Verkauf — diese vier Stationen brauchen unterschiedliche Informationen. Ohne Software landet alles in Excel-Listen, die niemand pflegt.",
            },
            {
              problem: "Reparaturkosten unklar",
              detail:
                "Wie viel kostet ein Gerät wirklich, wenn Arbeitsstunden und Ersatzteile einberechnet werden? Die meisten Betriebe wissen es nicht — und preisen entsprechend falsch.",
            },
            {
              problem: "Spendenquittungen manuell",
              detail:
                "Hunderte Quittungen pro Jahr, jede einzeln erstellt. Fehlerquelle und Zeitfresser.",
            },
            {
              problem: "Impact-Zahlen aus der Luft",
              detail:
                "Jahresberichte brauchen konkrete Zahlen. Ohne automatische Erfassung ist Impact-Reporting Schätzarbeit.",
            },
            {
              problem: "Freiwillige mit wenig Erfahrung",
              detail:
                "Die Software muss auch für jemanden funktionieren, der einmal pro Woche kommt und keine IT-Kenntnisse hat.",
            },
          ].map((p) => (
            <div
              key={p.problem}
              className="rounded-xl border-l-4 border-l-destructive/40 p-4 text-sm"
            >
              <div className="font-semibold mb-1">{p.problem}</div>
              <div className="text-muted-foreground">{p.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Was Kivvi für IT-Refurbisher bedeutet">
        <P>
          Kivvi wurde für genau diesen Betriebstyp gebaut — revamp-it in Zürich
          ist der erste Kunde und das lebende Referenzmodell. Jede Funktion
          wurde gegen reale Workflows getestet.
        </P>
        <div className="space-y-3">
          {[
            {
              feature: "Intake-Workflow",
              detail:
                "Gerät erfassen, Spendende zuordnen, Spendenquittung automatisch generieren — in unter zwei Minuten.",
            },
            {
              feature: "Reparaturqueue",
              detail:
                "Geräte werden einem Techniker zugewiesen. Status (in Test, in Reparatur, bereit) ist für alle sichtbar. Reparaturkosten und Stunden akkumulieren pro Gerät.",
            },
            {
              feature: "Zustandsverwaltung",
              detail:
                "Jedes Gerät hat einen Zustand (Gut / Mittel / Schlecht / Teile / Schrott), der den Preis und die Weiterverwertung bestimmt.",
            },
            {
              feature: "Impact-Dashboard",
              detail:
                "Geräte gerettet, CO₂ vermieden, Personen bedient — automatisch aus den erfassten Daten. Kein separates Reporting mehr.",
            },
            {
              feature: "Freiwilligen-tauglich",
              detail:
                "KI-gestützte Erfassung: Foto machen oder Text eintippen, Kivvi erkennt Marke, Modell, Kategorie. Keine Schulung nötig.",
            },
          ].map((f) => (
            <div
              key={f.feature}
              className="flex gap-3 rounded-xl border p-4 text-sm"
            >
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div>
                <div className="font-semibold mb-0.5">{f.feature}</div>
                <div className="text-muted-foreground">{f.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function BrockenhausArticle() {
  return (
    <>
      <Section title="Was ist ein Brockenhaus?">
        <P>
          Ein Brockenhaus — in Deutschland «Secondhand-Laden» oder
          «Charity-Shop» — nimmt gespendete Waren entgegen und verkauft sie zu
          günstigen Preisen weiter. Kleider, Möbel, Geschirr, Bücher,
          Elektrogeräte, Spielzeug: die Bandbreite ist riesig. In der Schweiz
          betreiben grosse Hilfswerke Brockenhäuser als Teil ihrer Sozialarbeit:
          Caritas, Heilsarmee, Emmaus, Rotes Kreuz, Schweizerische Arbeitshilfe.
          Daneben gibt es hunderte kleinerer, lokal betriebener Läden von
          Vereinen, Kirchgemeinden und Privatpersonen.
        </P>
        <P>
          Das Besondere am Brockenhaus: Es ist kein normaler Detailhandel. Die
          Ware kommt nicht von einem Lieferanten, sondern von anonymen Spendern.
          Es gibt keine Einkaufspreisliste. Der Wert jedes Stücks muss vor Ort
          geschätzt werden. Und gleichzeitig laufen oft Sozialeinsätze im
          gleichen Betrieb — Menschen in Beschäftigungsprogrammen arbeiten im
          Laden.
        </P>
      </Section>

      <Section title="Wer arbeitet dort?">
        <div className="space-y-4">
          {[
            {
              role: "Geschäftsleitung / Filialleitung",
              who: "1–2 Personen, bezahlt",
              does: "Betrieb führen, Team koordinieren, Finanzen, Kontakt zu Mutterorganisation, Spendenkampagnen, Jahresbericht",
            },
            {
              role: "Festangestellte Mitarbeitende",
              who: "2–6 Personen",
              does: "Warenannahme, Sortierung, Preisgebung, Kasse, Lager, Regalbetreuung",
            },
            {
              role: "Beschäftigte im Sozialeinsatz",
              who: "Variabel, oft 5–15",
              does: "Sortierung, Reinigung, einfache Arbeiten — Reintegration in den Arbeitsmarkt als Ziel",
            },
            {
              role: "Freiwillige",
              who: "Variabel, nach Bedarf",
              does: "Warenannahme, Sortierung, Kasse — oft ohne tiefes Systemwissen",
            },
          ].map((r) => (
            <div key={r.role} className="rounded-xl border p-4 text-sm">
              <div className="font-semibold mb-1">{r.role}</div>
              <div className="text-xs text-muted-foreground mb-2">{r.who}</div>
              <div className="text-muted-foreground">{r.does}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Der Weg einer Spende durch den Betrieb">
        <div className="space-y-2">
          {[
            {
              step: "1",
              label: "Annahme",
              detail:
                "Spendende bringen Waren — oft ohne Voranmeldung. Mitarbeitende entscheiden sofort: annehmen oder ablehnen. Kaputtes, Verschmutztes, nicht Verkäufliches kommt nicht rein.",
            },
            {
              step: "2",
              label: "Sortierung",
              detail:
                "Ware wird nach Kategorie sortiert: Kleider → Kategorie + Grösse + Zustand. Möbel → Funktionsprüfung. Elektro → Sicherheitstest (CE-Zeichen, Kabelzustand).",
            },
            {
              step: "3",
              label: "Preisgebung",
              detail:
                "Preis wird mit Aufkleber direkt auf die Ware geschrieben. Meist nach Erfahrung und Bauchgefühl — kaum systematisch.",
            },
            {
              step: "4",
              label: "Auslage",
              detail:
                "Ware wird in den Laden gestellt. Kleider auf Stangen, Möbel auf der Fläche, Bücher im Regal. Keine digitale Erfassung in den meisten Betrieben.",
            },
            {
              step: "5",
              label: "Verkauf",
              detail:
                "Kasse erfasst Betrag, aber oft ohne Artikelbezug. Was verkauft wurde, ist schwer nachzuvollziehen.",
            },
            {
              step: "6",
              label: "Räumung",
              detail:
                "Nicht verkaufte Ware nach X Wochen: weitere Rabattierung, Weitergabe an andere Läden oder Entsorgung.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="flex gap-4 rounded-xl border p-4 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {s.step}
              </div>
              <div>
                <div className="font-semibold mb-0.5">{s.label}</div>
                <div className="text-muted-foreground">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Das Geschäftsmodell">
        <P>
          Einnahmen kommen fast vollständig aus dem Warenverkauf. Grosse
          Brockenhäuser der Hilfswerke erzielen CHF 500&#39;000 bis mehrere
          Millionen Franken Jahresumsatz — und überweisen den Gewinn an die
          Mutterorganisation für Sozialarbeit. Kleinere Vereinsläden kommen mit
          CHF 30&#39;000–150&#39;000 aus und finanzieren damit lokale Projekte.
        </P>
        <P>
          Ein Brockenhaus ist wirtschaftlich gesund, wenn die Kosten (Miete,
          Personal, Entsorgung) durch die Einnahmen gedeckt werden. Anders als
          Detailhandel gibt es keinen Einkaufspreis — aber Entsorgungskosten für
          nicht verkäufliche Ware können erheblich sein.
        </P>
      </Section>

      <Section title="Wo Standardsoftware scheitert">
        <P>
          Die meisten Brockenhäuser arbeiten ohne ERP. An der Kasse steht ein
          einfaches Kassensystem oder eine Schublade. Was täglich verkauft wird,
          ist bekannt. Was reinkam, was noch im Lager liegt, welche Kategorien
          sich gut verkaufen — unbekannt.
        </P>
        <div className="space-y-3">
          {[
            {
              problem: "Kein Lieferant, kein Einkaufspreis",
              detail:
                "Standard-ERP setzt Lieferanten und Einkaufspreise voraus. Spenden passen nicht ins Schema.",
            },
            {
              problem: "Hoher Volumen, tiefer Einzelwert",
              detail:
                "Hunderte Artikel täglich zu CHF 1–30 einzeln zu erfassen ist nicht realistisch. Braucht Batch-Erfassung nach Kategorie.",
            },
            {
              problem: "Freiwillige als Hauptkraft",
              detail:
                "Die Software muss ohne Schulung bedienbar sein. Komplexe Menüs kosten Lehrstunden, die niemand hat.",
            },
            {
              problem: "Impact-Nachweis für Jahresbericht",
              detail:
                "«Wie viele kg Kleider haben wir umgeleitet?» — diese Fragen kommen jedes Jahr, werden aber nirgends automatisch erfasst.",
            },
          ].map((p) => (
            <div
              key={p.problem}
              className="rounded-xl border-l-4 border-l-destructive/40 p-4 text-sm"
            >
              <div className="font-semibold mb-1">{p.problem}</div>
              <div className="text-muted-foreground">{p.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Was Kivvi für Brockenhäuser bedeutet">
        <P>
          Kivvi ermöglicht kategoriebasierte Annahme mit automatischer
          Impact-Erfassung: jede angenommene Jacke, jeder Stuhl, jeder Drucker
          wird einem Gewicht und einem CO₂-Faktor zugeordnet. Der Jahresbericht
          entsteht auf Knopfdruck.
        </P>
        <P>
          Für Freiwillige: ein Formular, eine KI-Unterstützung, fertig. Für die
          Leitung: ein Dashboard mit Umsatz nach Kategorie, Bestand,
          Verweildauer und Impact-Kennzahlen. Keine zweite Buchhaltung in Excel.
          Keine Schätzungen im Jahresbericht.
        </P>
      </Section>
    </>
  );
}

function VintageFachhandelArticle() {
  return (
    <>
      <Section title="Was ist Vintage & Fachhandel?">
        <P>
          Vintage- und Fachhändler spezialisieren sich auf bestimmte Kategorien
          von Gebrauchtwaren, die einen Markt mit eigenen Preisgesetzen haben:
          Vintage-Kleidung der 60er bis 90er, antiquarische Bücher,
          Schallplatten, gebrauchte Musikinstrumente, Designermöbel, Kameras,
          Uhren, Fahrräder der oberen Preisklasse. In der Schweiz gibt es
          hunderte solcher Läden — viele als Einzelunternehmen oder kleine GmbH,
          einige als Online-Only, andere mit physischem Ladenlokal und
          Online-Präsenz.
        </P>
        <P>
          Was diesen Betriebstyp von einem Brockenhaus unterscheidet: die Marge
          ist höher, das Volumen ist tiefer, und jedes Stück hat eine
          individuelle Geschichte und einen spezifischen Wert. Ein Brockenhaus
          verkauft 500 Jacken pro Monat. Ein Vintage-Laden verkauft 50 —
          ausgewählt, aufbereitet, dokumentiert, und oft zu Preisen zwischen CHF
          30 und 500.
        </P>
      </Section>

      <Section title="Wer steckt dahinter?">
        <div className="space-y-4">
          {[
            {
              role: "Inhaber / Inhaberin",
              who: "1 Person, oft Einzelunternehmen",
              does: "Ankauf, Kuratierung, Preisgebung, Marketing, Verkauf, Buchhaltung — oft alles in einer Person",
            },
            {
              role: "Mitarbeitende",
              who: "0–3 Personen, oft Teilzeit",
              does: "Kasse, Kundenberatung, Lager, Online-Listings pflegen",
            },
            {
              role: "Externe Lieferanten / Verkäufer",
              who: "Variabel",
              does: "Bringen Waren zum Ankauf oder in Kommission — der Inhaber entscheidet was und zu welchem Preis",
            },
          ].map((r) => (
            <div key={r.role} className="rounded-xl border p-4 text-sm">
              <div className="font-semibold mb-1">{r.role}</div>
              <div className="text-xs text-muted-foreground mb-2">{r.who}</div>
              <div className="text-muted-foreground">{r.does}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Vom Ankauf zur Vitrine">
        <div className="space-y-2">
          {[
            {
              step: "1",
              label: "Ankauf / Beschaffung",
              detail:
                "Ware kommt durch Ankauf (Inhaber zahlt direkt), Kommission (Verkauf auf Rechnung des Eigentümers mit Provision), Nachlass/Räumungen oder Spenden.",
            },
            {
              step: "2",
              label: "Prüfung & Bewertung",
              detail:
                "Echtheit, Zustand, Seltenheit, Marktwert werden beurteilt. Beim Vintage-Kleid: Label, Epoche, Material, Schäden. Beim Instrument: Spielbarkeit, Baujahr, Originalität.",
            },
            {
              step: "3",
              label: "Aufbereitung",
              detail:
                "Reinigung, kleine Reparaturen, Polierung. Bei Kleidung: Wäsche, Bügelei. Bei Instrumenten: Stimmung, Saitenwechsel. Kosten dieser Arbeit müssen im Preis drin sein.",
            },
            {
              step: "4",
              label: "Dokumentation",
              detail:
                "Fotos, Beschreibung, Besonderheiten. Für den Laden und für Online-Listings. Je besser die Dokumentation, desto höher der erzielbare Preis.",
            },
            {
              step: "5",
              label: "Preisgebung",
              detail:
                "Marktvergleich, Zustandsabzug, Aufbereitungsaufwand, gewünschte Marge. Oft auch: was hat der Inhaber bezahlt oder dem Kommissionsverkäufer zugesagt?",
            },
            {
              step: "6",
              label: "Verkauf",
              detail:
                "Im Laden, auf Platforms (Ricardo, Tutti, Vinted, eBay), Instagram-Shop. Oft mehrere Kanäle gleichzeitig — und die Synchronisation ist manuell.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="flex gap-4 rounded-xl border p-4 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {s.step}
              </div>
              <div>
                <div className="font-semibold mb-0.5">{s.label}</div>
                <div className="text-muted-foreground">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Das Geschäftsmodell">
        <P>
          Die Marge ist das Herzstück. Ein Vintage-Kleid für CHF 15 eingekauft
          und für CHF 80 verkauft — das ist 433% Aufschlag. Aber die
          Aufbereitungsarbeit kostet Zeit, die Miete für den Laden läuft, und
          nicht jedes Stück verkauft sich. Wer die tatsächliche Marge nicht
          kennt, führt den Betrieb im Blindflug.
        </P>
        <P>
          Kommissionsverkauf ist ein weiteres Modell: Der Kunde bringt sein
          Stück, der Laden verkauft es und behält eine Provision (meist 30–50%).
          Das erhöht das Sortiment ohne Kapitaleinsatz — aber erfordert genaues
          Tracking, wem was gehört und was verkauft wurde.
        </P>
      </Section>

      <Section title="Die besonderen Herausforderungen">
        <div className="space-y-3">
          {[
            {
              problem: "Jedes Stück ist ein Unikat",
              detail:
                "Kein Barcode, keine Stückliste. Artikelnummern müssen manuell erstellt werden. Beschreibungen sind individuell.",
            },
            {
              problem: "Kommission braucht sauberes Tracking",
              detail:
                "Wer hat was abgegeben, was wurde für wie viel verkauft, was ist die Provision, was wird ausgezahlt? Ohne System ein Alptraum.",
            },
            {
              problem: "Multichannel-Synchronisation",
              detail:
                "«Ich hab das gerade online verkauft, jetzt steht der Kunde im Laden dafür» — ohne zentrales System passiert das regelmässig.",
            },
            {
              problem: "Buchhaltung für Kleinstbeträge",
              detail:
                "Hunderte Transaktionen unter CHF 100. MWST-pflichtig ab CHF 100&#39;000 Umsatz. Trotzdem braucht man saubere Belege.",
            },
          ].map((p) => (
            <div
              key={p.problem}
              className="rounded-xl border-l-4 border-l-destructive/40 p-4 text-sm"
            >
              <div className="font-semibold mb-1">{p.problem}</div>
              <div className="text-muted-foreground">{p.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Was Kivvi für Fachhändler bedeutet">
        <P>
          Jedes Stück wird als Einzelartikel mit Geschichte erfasst: Herkunft,
          Einkaufspreis oder Kommissionsvereinbarung, Aufbereitungsaufwand,
          Fotos, Zustand. Der Verkaufspreis ergibt sich aus diesen Fakten — und
          die Marge ist jederzeit sichtbar.
        </P>
        <P>
          Kommissionsverkauf läuft als eigener Dokumenttyp: Ware wird dem
          Kommittenten zugeordnet, der Verkauf generiert automatisch eine
          Abrechnung. Kein manuelles Ausrechnen, keine vergessenen Auszahlungen.
        </P>
      </Section>
    </>
  );
}

function ReparaturwerkstattArticle() {
  return (
    <>
      <Section title="Zwei Modelle, eine Philosophie">
        <P>
          Reparaturbetriebe gibt es in zwei sehr unterschiedlichen Formen — aber
          mit derselben Grundüberzeugung: Dinge, die noch zu reparieren sind,
          gehören nicht in den Abfall.
        </P>
        <P>
          Die <strong>professionelle Reparaturwerkstatt</strong> ist ein
          Gewerbebetrieb. Sie nimmt Aufträge an, erstellt Kostenvoranschläge,
          kauft Ersatzteile, stellt Rechnungen aus. Velowerkstätten,
          Elektroreparatur-Ateliers, Schuhflicker, Schneiderinnen — alle
          operieren nach diesem Muster. Umsatz entsteht durch
          Dienstleistungsverkauf.
        </P>
        <P>
          Das <strong>Repair Café</strong> ist ein gemeinnütziger Betrieb.
          Menschen bringen kaputte Dinge, Freiwillige helfen beim Reparieren,
          Reparatur ist kostenlos oder gegen eine kleine Kollekte. Das Ziel ist
          nicht Gewinn, sondern Gemeinschaft und Ressourcenschonung. Trotzdem
          braucht auch ein Repair Café Dokumentation: Was wurde repariert, was
          nicht, welchen Impact hat das?
        </P>
      </Section>

      <Section title="Die Menschen in der Werkstatt">
        <div className="space-y-4">
          {[
            {
              role: "Inhaber / Werkstattleiter",
              context: "Professionelle Werkstatt",
              does: "Auftragsannahme, Kostenvoranschläge, Rechnungsstellung, Einkauf von Ersatzteilen, Personalführung",
            },
            {
              role: "Techniker / Mechaniker",
              context: "Professionelle Werkstatt",
              does: "Diagnose, Reparatur, Qualitätskontrolle, Kundenrückgabe — oft spezialisiert (Velo, Elektro, Textil)",
            },
            {
              role: "Organisationskomitee",
              context: "Repair Café",
              does: "Termine planen, Raum organisieren, Materialien besorgen, Kommunikation, Impact dokumentieren",
            },
            {
              role: "Freiwillige Reparaturexperten",
              context: "Repair Café",
              does: "Mitbringen ihr Fachwissen: Elektriker, Näher, Velomechaniker, IT-Kenntnisse — ehrenamtlich",
            },
          ].map((r) => (
            <div key={r.role} className="rounded-xl border p-4 text-sm">
              <div className="font-semibold mb-1">{r.role}</div>
              <div className="text-xs text-muted-foreground mb-2">
                {r.context}
              </div>
              <div className="text-muted-foreground">{r.does}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Der Weg eines Auftrags">
        <div className="space-y-2">
          {[
            {
              step: "1",
              label: "Auftragsannahme",
              detail:
                "Kunde bringt Gerät / Objekt. Kundendaten erfassen, Symptom beschreiben, Erstdiagnose. Bei Werkstatt: Auftragsformular und Eingangsbeleg. Bei Repair Café: Anmeldung, Warteschlange.",
            },
            {
              step: "2",
              label: "Diagnose",
              detail:
                "Techniker untersucht das Gerät. Ergebnis: reparierbar zu welchem Preis, oder wirtschaftlich nicht sinnvoll. Bei Werkstatt: Kostenvoranschlag erstellen und Freigabe vom Kunden einholen.",
            },
            {
              step: "3",
              label: "Ersatzteile",
              detail:
                "Welche Teile werden gebraucht? Auf Lager? Bestellen? Kosten? Bei kleinen Werkstätten oft aus Erfahrung und ohne System.",
            },
            {
              step: "4",
              label: "Reparatur",
              detail:
                "Arbeitsstunden werden aufgezeichnet (oder sollten es). Bei komplexen Aufträgen: Zwischenstand dem Kunden kommunizieren.",
            },
            {
              step: "5",
              label: "Abschluss & Übergabe",
              detail:
                "Qualitätskontrolle, Reinigung, Rückgabe an Kunden. Bei Werkstatt: Rechnung erstellen. Bei Repair Café: Reparatur in System einloggen für Impact-Reporting.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="flex gap-4 rounded-xl border p-4 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {s.step}
              </div>
              <div>
                <div className="font-semibold mb-0.5">{s.label}</div>
                <div className="text-muted-foreground">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Das Geschäftsmodell">
        <P>
          Professionelle Werkstätten leben von Arbeitsstunden und Ersatzteilen.
          Der Stundensatz variiert je nach Spezialisierung: CHF 80–150/h für
          Veloreparatur, mehr für Elektronik. Profitabilität hängt daran,
          Wartezeiten zu minimieren, Teile rechtzeitig verfügbar zu haben und
          Rechnungen zeitnah zu stellen.
        </P>
        <P>
          Repair Cafés finanzieren sich durch Kollekte, Mitgliederbeiträge des
          Trägervereins und gelegentlich Fördergelder. Das wirtschaftliche
          Risiko ist gering — aber Wachstum (mehr Termine, mehr Freiwillige,
          mehr Standorte) braucht Koordination und Dokumentation.
        </P>
      </Section>

      <Section title="Wo es operativ hakt">
        <div className="space-y-3">
          {[
            {
              problem: "Auftragsverfolgung aus dem Kopf",
              detail:
                "«Das Velo von Herrn Müller steht hinten links» ist kein System. Bei 10 offenen Aufträgen funktioniert das; bei 30 nicht mehr.",
            },
            {
              problem: "Ersatzteilmanagement",
              detail:
                "Welche Teile sind auf Lager? Was muss bestellt werden? Ohne Lagerverwaltung endet das in überfüllten Regalen und trotzdem fehlenden Teilen.",
            },
            {
              problem: "Rechnungsstellung verzögert",
              detail:
                "Bei kleinen Werkstätten liegt die Rechnung oft Wochen nach der Reparatur. Schlechter Cashflow, verärgerter Kunde.",
            },
            {
              problem: "Impact-Dokumentation für Repair Cafés",
              detail:
                "«Wir haben dieses Jahr 340 Geräte repariert und 2.1 Tonnen CO₂ eingespart» — diese Aussage braucht Datenbasis.",
            },
          ].map((p) => (
            <div
              key={p.problem}
              className="rounded-xl border-l-4 border-l-destructive/40 p-4 text-sm"
            >
              <div className="font-semibold mb-1">{p.problem}</div>
              <div className="text-muted-foreground">{p.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Was Kivvi für Reparaturbetriebe bedeutet">
        <P>
          Reparaturaufträge laufen in Kivvi als Dokumente durch einen
          definierten Workflow: Auftragsannahme → Diagnose → Reparatur in Arbeit
          → Abgeschlossen → Rechnung erstellt. Jeder Status ist einem
          Mitarbeitenden zugewiesen, der Kunde kann auf Wunsch benachrichtigt
          werden.
        </P>
        <P>
          Arbeitsstunden und Materialkosten akkumulieren pro Auftrag. Die
          Rechnung entsteht aus den erfassten Daten — kein manuelles
          Zusammenrechnen. Und Impact-Kennzahlen (Geräte repariert, geschätztes
          Gewicht, CO₂) werden automatisch aus den Reparaturprotokollen
          berechnet.
        </P>
      </Section>
    </>
  );
}

function VelofachhandelArticle() {
  return (
    <>
      <Section title="Wer handelt mit gebrauchten Velos?">
        <P>
          Der Markt für gebrauchte Fahrräder ist grösser als er aussieht. In der
          Schweiz verkaufen private Anbieter auf Ricardo und Tutti, soziale
          Unternehmen refurbishen gespendete Velos für einkommensschwache
          Personen, professionelle Velohändler kaufen, reparieren und
          zertifizieren hochwertige Occasionsvelos — und Fahrradmarken wie
          Stromer oder Trek bauen Take-Back-Programme für ihre Kunden auf.
        </P>
        <P>
          Gemeinsam ist allen: Ein Velo ist kein generisches Produkt, sondern
          ein Einzelstück mit Rahmennummer, Baujahr, Komponenten und Geschichte.
          Es kommt mit unbekanntem Zustand rein, muss bewertet, repariert und
          mit klarer Angabe des Zustands verkauft werden. Das ist Refurbishing —
          exakt dasselbe Modell wie beim IT-Refurbisher, nur mit zwei Rädern.
        </P>
      </Section>

      <Section title="Das Team">
        <div className="space-y-4">
          {[
            {
              role: "Inhaber / Geschäftsleitung",
              who: "1–2 Personen",
              does: "Ankauf, Preisgebung, Verkauf, Buchhaltung, Partnerbeziehungen (z.B. Sozialhilfe, Schulen)",
            },
            {
              role: "Velomechaniker",
              who: "1–4 Personen",
              does: "Inspektion, Wartung, Reparatur, Komponentenwechsel, Qualitätskontrolle vor Verkauf",
            },
            {
              role: "Verkauf / Beratung",
              who: "1–2 Personen, manchmal identisch mit Mechaniker",
              does: "Kundenberatung, Probefahrten, Übergabe, Zahlungsabwicklung",
            },
            {
              role: "Freiwillige (soziale Betriebe)",
              who: "Variabel",
              does: "Reinigung, einfache Reparaturen, Lagerhaltung",
            },
          ].map((r) => (
            <div key={r.role} className="rounded-xl border p-4 text-sm">
              <div className="font-semibold mb-1">{r.role}</div>
              <div className="text-xs text-muted-foreground mb-2">{r.who}</div>
              <div className="text-muted-foreground">{r.does}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Der Lebenszyklus eines Velos">
        <div className="space-y-2">
          {[
            {
              step: "1",
              label: "Annahme / Ankauf",
              detail:
                "Velo kommt rein — durch Ankauf, Spende, Take-Back-Programm oder Schenkung. Rahmennummer und Erstbeschreibung werden erfasst. Bei Ankauf: Preis verhandeln und dokumentieren.",
            },
            {
              step: "2",
              label: "Inspektion",
              detail:
                "Mechaniker beurteilt: Rahmen (Risse, Verbiegungen?), Gabel, Bremsen, Schaltung, Reifen, Lager. Ergebnis: Reparaturbedarf und geschätzte Kosten.",
            },
            {
              step: "3",
              label: "Reparatur & Service",
              detail:
                "Alles Defekte wird ersetzt oder eingestellt. Kette, Kassette, Bremspads, Kabel — nach Bedarf. Kosten werden pro Velo akkumuliert.",
            },
            {
              step: "4",
              label: "Reinigung & Finish",
              detail:
                "Velo wird gereinigt, poliert, alles kontrolliert. Manchmal: neue Griffgummis, neuer Sattel, neue Griffe für bessere Präsentation.",
            },
            {
              step: "5",
              label: "Zertifizierung & Preisgebung",
              detail:
                "Offizieller Zustand wird dokumentiert. Verkaufspreis ergibt sich aus Marktwert, Zustand und eigenem Aufwand.",
            },
            {
              step: "6",
              label: "Verkauf",
              detail:
                "Im Laden, online (Velomarkt.ch, Ricardo, eigene Website), oder direkt an Partner (Sozialhilfebehörden, Schulen). Rahmennummer wird im Verkaufsdokument festgehalten.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="flex gap-4 rounded-xl border p-4 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {s.step}
              </div>
              <div>
                <div className="font-semibold mb-0.5">{s.label}</div>
                <div className="text-muted-foreground">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Das Geschäftsmodell">
        <P>
          Ein refurbishtes Velo für CHF 80 eingekauft, CHF 60 in Reparatur
          investiert, für CHF 350 verkauft — das klingt nach guter Marge. Aber
          wenn der Reparaturaufwand aus dem Kopf statt aus dem System kommt,
          weiss niemand ob es tatsächlich CHF 60 oder CHF 140 Aufwand waren.
        </P>
        <P>
          Soziale Betriebe (Velo für alle, BikeToWork-Partner) arbeiten oft mit
          Subventionen oder Fördergeldern — und müssen entsprechend Impact
          nachweisen: Velos refurbished, Personen mit mobilem Zugang versorgt,
          CO₂ im Vergleich zu Neuproduktion eingespart.
        </P>
      </Section>

      <Section title="Die besonderen Herausforderungen">
        <div className="space-y-3">
          {[
            {
              problem: "Rahmennummer als Identität",
              detail:
                "Jedes Velo hat eine eindeutige Rahmennummer. Diese gehört ins System — für Diebstahlschutz, Garantie, Rückverfolgbarkeit.",
            },
            {
              problem: "Reparaturkosten unsichtbar",
              detail:
                "Werkstunden akkumulieren sich über mehrere Tage. Ohne Erfassung entsteht der Preis aus dem Bauchgefühl statt aus den Fakten.",
            },
            {
              problem: "Lager schwer überblickbar",
              detail:
                "20 Velos in der Werkstatt in verschiedenen Stadien — wer wofür bereit ist, weiss nur der Mechaniker. Bis er krank ist.",
            },
            {
              problem: "Diebstahlschutz & Dokumentation",
              detail:
                "Ein verkauftes Velo, das sich später als gestohlen herausstellt, ist ein rechtliches Problem. Rahmennummer im System schützt.",
            },
          ].map((p) => (
            <div
              key={p.problem}
              className="rounded-xl border-l-4 border-l-destructive/40 p-4 text-sm"
            >
              <div className="font-semibold mb-1">{p.problem}</div>
              <div className="text-muted-foreground">{p.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Was Kivvi für den Velohandel bedeutet">
        <P>
          Jedes Velo ist ein Einzelartikel in Kivvi: Rahmennummer, Baujahr,
          Marke, Modell, Zustand — eindeutig identifizierbar. Der Weg durch die
          Werkstatt (Annahme → Inspektion → Reparatur → Bereit) ist transparent.
          Reparaturkosten akkumulieren automatisch.
        </P>
        <P>
          Der Verkauf erzeugt eine Rechnung mit Seriennummer. Der
          Zustandsbericht ist Teil des Dokuments. Impact-Reporting (Velos
          umgeleitet, km Mobilität ermöglicht) entsteht aus den Systemdaten —
          nicht aus dem Jahresend-Schätzen.
        </P>
      </Section>
    </>
  );
}

function RevampItArticle() {
  return (
    <>
      <Section title="Wer ist revamp-it?">
        <P>
          revamp-it wurde 2003 in Zürich gegründet und ist heute einer der
          bekanntesten IT-Refurbisher der Schweiz. Der Verein rettet jährlich
          tausende Computer, Laptops, Monitore und Drucker vor der Entsorgung —
          von Unternehmens-Abgaben, Schulen und Privatpersonen. Aufbereitet und
          mit Linux ausgestattet werden sie an einkommensschwache Haushalte,
          soziale Institutionen und Bildungseinrichtungen weitergegeben. Über
          Partner wie Linuxola gehen Geräte auch in Entwicklungsländer.
        </P>
        <P>
          revamp-it ist kein Sozialhilfeprojekt — es ist ein professionell
          geführter Betrieb mit klaren Prozessen, einem engagierten Team aus
          Festangestellten und Freiwilligen, und einer nachweisbaren Wirkung auf
          die digitale Teilhabe in der Region Zürich. Gleichzeitig ist revamp-it
          Verein, nicht GmbH: kollektive Führung, gemeinnützige Ausrichtung,
          keine Gewinnabsicht.
        </P>
      </Section>

      <Section title="Die Organisation">
        <div className="space-y-4">
          {[
            {
              role: "Vorstand",
              count: "5–7 Personen, ehrenamtlich",
              does: "Strategische Führung, rechtliche Verantwortung, Budgetgenehmigung, Partnerbeziehungen zu Fördergebern. Tritt mehrmals pro Jahr zusammen.",
            },
            {
              role: "Koordination / Geschäftsleitung",
              count: "1–2 Personen, bezahlt",
              does: "Operativer Betrieb, Teamführung, Firmenkontakte für Gerätespenden, Fördermittelanträge, Finanzen, Öffentlichkeitsarbeit. Das Rückgrat des Betriebs.",
            },
            {
              role: "Techniker / Refurbisher",
              count: "3–6 Personen, mix aus Fest- und Teilzeit",
              does: "Tests, Diagnose, Reparatur, Linux-Installation, Datenlöschung, Qualitätskontrolle. Oft Menschen mit IT-Hintergrund oder in Ausbildung.",
            },
            {
              role: "Intake & Lager",
              count: "1–2 Personen",
              does: "Geräteannahme, Ersterfassung, Spendenadministration, Lagerhaltung, Logistik.",
            },
            {
              role: "Freiwillige",
              count: "20–50 aktive Personen",
              does: "Verschiedenste Aufgaben je nach Kenntnisstand: einfache Tests, Reinigung, Verpackung, Events. Kommen unregelmässig — brauchen einfache Prozesse.",
            },
          ].map((r) => (
            <div key={r.role} className="rounded-xl border p-4 text-sm">
              <div className="font-semibold mb-1">{r.role}</div>
              <div className="text-xs text-muted-foreground mb-2">
                {r.count}
              </div>
              <div className="text-muted-foreground">{r.does}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Ein Tag bei revamp-it">
        <P>
          Morgens öffnet das Lager in Zürich-Altstetten. Ein Firmenkurier bringt
          12 Boxen Laptops — Abgabe einer Versicherung, die ihren IT-Park
          erneuert. Ein Freiwilliger nimmt die Geräte entgegen, fotografiert die
          Boxen, erfasst den Spender. Spendenquittung wird ausgelöst. Die
          Laptops kommen auf den Intake-Stapel.
        </P>
        <P>
          Am Testplatz arbeiten zwei Techniker systematisch: Displays
          einschalten, RAM prüfen, Festplatten auf S.M.A.R.T.-Werte testen,
          Akkus messen. Jeder Laptop bekommt einen Status: bereit für Linux,
          Akku tauschen, Display defekt, Schrott. Was reparierbar ist, geht in
          die Reparaturqueue — mit Zuweisung an einen Techniker.
        </P>
        <P>
          Mittags kommt eine Sozialhilfebezieherin, die einen Laptop für ihre
          Tochter sucht. Sie bekommt drei Geräte zur Auswahl, wählt ein ThinkPad
          für CHF 120. Am Nachmittag kommen zwei neue Freiwillige — sie reinigen
          fertig aufbereitete Geräte für den Versand nach Malawi.
        </P>
      </Section>

      <Section title="Das Geschäftsmodell">
        <div className="space-y-3 mb-4">
          {[
            {
              source: "Geräteveräusserung",
              share: "~50%",
              detail:
                "Laptops CHF 80–280, Desktops CHF 40–120, Monitore CHF 20–80 je nach Zustand und Modell",
            },
            {
              source: "Entsorgungsgebühren",
              share: "~25%",
              detail:
                "Unternehmen zahlen für zertifizierte Datenlöschung und Entsorgungsnachweis",
            },
            {
              source: "Fördergelder & Spenden",
              share: "~25%",
              detail:
                "Projektgebundene Förderung für Bildungsprojekte, Linuxola-Transporte, digitale Inklusion",
            },
          ].map((s) => (
            <div
              key={s.source}
              className="grid sm:grid-cols-3 gap-2 rounded-xl border p-4 text-sm"
            >
              <div className="font-semibold">{s.source}</div>
              <div className="font-medium text-primary">{s.share}</div>
              <div className="text-muted-foreground">{s.detail}</div>
            </div>
          ))}
        </div>
        <P>
          Die wirtschaftliche Tragfähigkeit hängt direkt daran, wie effizient
          Geräte durch den Betrieb fliessen. Ein Gerät, das zwei Wochen
          unbearbeitet im Lager liegt, ist gebundenes Kapital und verpasster
          Impact. Jede Stunde, die ein Techniker mit Administration statt mit
          Reparatur verbringt, kostet Geräte.
        </P>
      </Section>

      <Section title="Was revamp-it vor Kivvi verwendete">
        <P>
          Wie die meisten IT-Refurbisher der ersten Generation setzte revamp-it
          auf Kivitendo — ein solides Open-Source-ERP für klassischen Handel.
          Kivitendo kennt Einkauf, Lager, Verkauf. Aber IT-Refurbishing ist kein
          klassischer Handel.
        </P>
        <div className="space-y-3">
          {[
            {
              problem: "Kein Intake-Workflow",
              detail:
                "Kivitendo kennt Lieferanten und Einkaufspreise — aber keine Spenden, keine Spendenquittungen, keine Annahmeprozesse ohne Kaufvorgang.",
            },
            {
              problem: "Kein Zustandstracking",
              detail:
                "Ob ein Laptop «Gut», «Akku defekt» oder «Für Teile» ist, musste in Freitextfeldern geführt werden — kein Workflow, keine Automatik.",
            },
            {
              problem: "Keine Reparaturqueue",
              detail:
                "Wer repariert was? In welchem Stadium? Welche Kosten sind aufgelaufen? Diese Information lebte im Kopf der Techniker.",
            },
            {
              problem: "Impact aus Excel",
              detail:
                "Jahresberichte und Förderanträge brauchten Impact-Zahlen, die aus verschiedenen Quellen manuell zusammengestöpselt wurden.",
            },
            {
              problem: "Freiwillige überfordert",
              detail:
                "Kivitendo hat eine Lernkurve. Freiwillige, die einmal pro Woche kommen, konnten das System kaum selbstständig bedienen.",
            },
          ].map((p) => (
            <div
              key={p.problem}
              className="rounded-xl border-l-4 border-l-destructive/40 p-4 text-sm"
            >
              <div className="font-semibold mb-1">{p.problem}</div>
              <div className="text-muted-foreground">{p.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Warum revamp-it Kivvi brauchte">
        <P>
          Die Anforderung war klar: ein System, das den gesamten Gerätefluss von
          der Annahme bis zum Verkauf ohne Medienbrüche abbildet, das
          Freiwillige ohne Schulung bedienen können, und das Impact-Kennzahlen
          automatisch erfasst statt manuell zusammenzustellen.
        </P>
        <P>
          Hinzu kam der Schweizer Kontext: QR-Rechnungen, MWST-Besonderheiten
          für gemeinnützige Betriebe, Spendenquittungen nach Schweizer Recht,
          CHF mit Rappen-Rundung, KMU-Kontenrahmen. Eine ausländische Software
          passt hier einfach nicht.
        </P>
        <P>
          Kivvi wurde mit revamp-it gebaut und an revamp-it erprobt. Jeder
          Workflow — Intake, Triage, Reparaturzuweisung, Preisgebung, Verkauf,
          Spendenquittung, Impact-Report — wurde gegen die reale Praxis
          entwickelt und validiert.
        </P>
      </Section>

      <Section title="Revamp-it als Blaupause">
        <P>
          Was revamp-it braucht, brauchen alle IT-Refurbisher. Was
          IT-Refurbisher brauchen, brauchen mit Abwandlungen auch Brockenhäuser,
          Velowerkstätten, Repair Cafés und Vintage-Läden. revamp-it ist nicht
          ein Sonderfall — es ist das konsequenteste Beispiel dafür, wie
          Kreislaufwirtschaft im Kleinen wirklich funktioniert.
        </P>
        <P>
          Deshalb ist revamp-it das Referenzmodell für Kivvi: Intake ohne
          Einkaufspreis, Zustandsvarianz, Reparaturbedarf, Freiwilligenteam,
          Impact-Nachweis, Gemeinnützigkeit, Schweizer Compliance — alles in
          einem Betrieb konzentriert. Wer Kivvi für revamp-it richtig macht,
          macht es für die ganze Branche richtig.
        </P>
      </Section>
    </>
  );
}
