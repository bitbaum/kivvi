import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import type { Metadata } from "next";

const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "revamp-it",
  url: "https://revamp-it.ch",
  foundingDate: "2003",
  description: "IT-Refurbisher und Entwickler von Kivvi ERP",
};

const FAQ_PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Was ist Kivvi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kivvi ist ein Open-Source-ERP (Enterprise Resource Planning) speziell für Betriebe der Kreislaufwirtschaft — Brockenhäuser, IT-Refurbisher, Repair Cafés, Vintage-Shops und ähnliche Organisationen. Es verwaltet den gesamten Lebenszyklus von Waren: von der Annahme über Bewertung und Reparatur bis zu Verkauf und Impact-Messung. Kivvi ist in der Schweiz entwickelt und nativ auf Schweizer Recht (QR-Rechnung, MWST, Spendenrecht) ausgelegt.",
      },
    },
    {
      "@type": "Question",
      name: "Ist Kivvi kostenlos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Kivvi ist unter der MIT-Lizenz veröffentlicht — Sie können es kostenlos nutzen, hosten, anpassen und weitergeben. Es gibt keine Lizenzkosten, keine Abo-Gebühren, kein Freemium-Modell. Kosten entstehen nur durch den Betrieb der Infrastruktur (Server, Backup), wenn Sie selbst hosten — oder durch eine etwaige externe Hosting-Dienstleistung.",
      },
    },
    {
      "@type": "Question",
      name: "Kann ich Kivvi selbst hosten?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja, Kivvi ist für Self-Hosting konzipiert. Sie brauchen einen Server mit PostgreSQL und Node.js. Die Einrichtung dauert für technisch versierte Personen etwa eine Stunde. Ihre Daten bleiben vollständig unter Ihrer Kontrolle — kein Cloud-Anbieter hat Zugriff. Für Betriebe ohne eigene IT bieten wir gehostete Instanzen an.",
      },
    },
    {
      "@type": "Question",
      name: "Für wen ist Kivvi geeignet?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kivvi ist für Betriebe gemacht, die Waren ein zweites Leben geben: Brockenhäuser und Sozialkaufhäuser, IT-Refurbisher und Computer-Recycler, Repair Cafés und Werkstätten, Vintage-Shops und Kleiderbörsen, Fahrrad-Refurbisher, Upcycling-Ateliers und gemeinnützige Organisationen mit Warenlogistik. Wer neue Waren verkauft, ist besser mit einem Standard-ERP bedient.",
      },
    },
    {
      "@type": "Question",
      name: "In welchen Sprachen ist Kivvi verfügbar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Die Benutzeroberfläche ist auf Deutsch (Schweiz), Englisch und Französisch verfügbar. Die Oberfläche lässt sich per Sprachumschalter wechseln. Für weitere Sprachen können Übersetzungen über das Open-Source-Projekt beigesteuert werden.",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "FAQ — Häufige Fragen zu Kivvi",
  description:
    "Antworten auf die häufigsten Fragen zu Kivvi: Kosten, Self-Hosting, Unterschied zu Bexio und Kivitendo, Kreislaufwirtschaft, QR-Rechnungen, Datenschutz und mehr.",
};

const FAQ_GROUPS = [
  {
    id: "allgemeines",
    title: "Allgemeines",
    questions: [
      {
        q: "Was ist Kivvi?",
        a: "Kivvi ist ein Open-Source-ERP (Enterprise Resource Planning) speziell für Betriebe der Kreislaufwirtschaft — Brockenhäuser, IT-Refurbisher, Repair Cafés, Vintage-Shops und ähnliche Organisationen. Es verwaltet den gesamten Lebenszyklus von Waren: von der Annahme über Bewertung und Reparatur bis zu Verkauf und Impact-Messung. Kivvi ist in der Schweiz entwickelt und nativ auf Schweizer Recht (QR-Rechnung, MWST, Spendenrecht) ausgelegt.",
      },
      {
        q: "Ist Kivvi kostenlos?",
        a: "Ja. Kivvi ist unter der MIT-Lizenz veröffentlicht — Sie können es kostenlos nutzen, hosten, anpassen und weitergeben. Es gibt keine Lizenzkosten, keine Abo-Gebühren, kein Freemium-Modell. Kosten entstehen nur durch den Betrieb der Infrastruktur (Server, Backup), wenn Sie selbst hosten — oder durch eine etwaige externe Hosting-Dienstleistung.",
      },
      {
        q: "Kann ich Kivvi selbst hosten?",
        a: "Ja, Kivvi ist für Self-Hosting konzipiert. Sie brauchen einen Server mit PostgreSQL und Node.js. Die Einrichtung dauert für technisch versierte Personen etwa eine Stunde. Ihre Daten bleiben vollständig unter Ihrer Kontrolle — kein Cloud-Anbieter hat Zugriff. Für Betriebe ohne eigene IT bieten wir gehostete Instanzen an.",
      },
      {
        q: "Für wen ist Kivvi geeignet?",
        a: "Kivvi ist für Betriebe gemacht, die Waren ein zweites Leben geben: Brockenhäuser und Sozialkaufhäuser, IT-Refurbisher und Computer-Recycler, Repair Cafés und Werkstätten, Vintage-Shops und Kleiderbörsen, Fahrrad-Refurbisher, Upcycling-Ateliers und gemeinnützige Organisationen mit Warenlogistik. Wer neue Waren verkauft, ist besser mit einem Standard-ERP bedient.",
      },
      {
        q: "In welchen Sprachen ist Kivvi verfügbar?",
        a: "Die Benutzeroberfläche ist auf Deutsch (Schweiz), Englisch und Französisch verfügbar. Die Oberfläche lässt sich per Sprachumschalter wechseln. Für weitere Sprachen können Übersetzungen über das Open-Source-Projekt beigesteuert werden.",
      },
      {
        q: "Ist Kivvi nur für die Schweiz?",
        a: "Nein — Kivvi kann überall eingesetzt werden. Einige Funktionen sind jedoch Schweiz-spezifisch: QR-Rechnungen nach Schweizer Standard, MWST-Sätze (8.1%, 2.6%, 0%), Rappen-Rundung auf 0.05 CHF und Spendenquittungen nach Schweizer Recht. Betriebe in Deutschland oder Österreich können Kivvi nutzen, müssen aber diese Compliance-Felder entsprechend anpassen.",
      },
    ],
  },
  {
    id: "vergleich",
    title: "Kivvi vs. andere Software",
    questions: [
      {
        q: "Was ist der Unterschied zu Bexio oder Abacus?",
        a: "Bexio und Abacus sind allgemeine Schweizer Buchhaltungs- und ERP-Software für Betriebe, die neue Waren verkaufen. Sie können Lagermengen, Rechnungen und MWST verwalten — aber sie kennen kein Konzept für Einzelartikel-Zustandsbewertung, Spendenquittungen, Reparaturprotokolle pro Gerät oder Impact-Dashboards. Für einen Secondhand-Betrieb enden Sie mit Workarounds und Excel-Tabellen neben dem System. Kivvi löst genau diese Probleme nativ.",
      },
      {
        q: "Kann Kivvi Kivitendo ersetzen?",
        a: "Ja — das war ein Hauptziel bei der Entwicklung. Kivvi bietet eine vollständige Warenwirtschaft mit Angeboten, Aufträgen, Lieferscheinen, Rechnungen und Buchhaltung, wie Kivitendo. Zusätzlich bringt Kivvi Einzelartikel-Tracking, Zustandsbewertung, Reparaturprotokoll und Impact-Dashboard — Dinge, die Kivitendo für Secondhand-Betriebe nie richtig abgebildet hat. Daten lassen sich via CSV aus Kivitendo exportieren und in Kivvi importieren.",
      },
      {
        q: "Was ist der Unterschied zu einer normalen Lagerverwaltung?",
        a: "Normale Lagerverwaltungen denken in SKUs: «50 Lenovo ThinkPad T14 — Menge: 50». Kivvi denkt in Individuen: Laptop #23 hat Kratzer am Gehäuse, Batterie 78%, wurde für CHF 40 repariert, Richtpreis CHF 95, Mindestpreis CHF 70. Dieser Unterschied ist fundamental — er ermöglicht echte Margenberechnung pro Gerät, Qualitätsnachweise und Reparaturhistorien, die Standard-Lagersysteme strukturell nicht abbilden können.",
      },
      {
        q: "Warum kein Standard-ERP mit Anpassungen?",
        a: "Standard-ERPs basieren auf Grundannahmen, die für Kreislaufbetriebe falsch sind: Waren kommen von Lieferanten (nicht Spendern), haben einen fixen Wert bei Eingang (nicht einen bewerteten), werden als Menge geführt (nicht als Individuen), und Impact ist kein Geschäftsbegriff. Diese Annahmen sind tief im Datenmodell verankert. Workarounds kosten mehr Zeit als ein System, das von Anfang an richtig denkt.",
      },
      {
        q: "Ist Kivvi ein vollständiges ERP oder nur eine Warenverwaltung?",
        a: "Kivvi ist ein vollständiges ERP: Kontaktverwaltung (Kunden, Lieferanten, Spender), Warenwirtschaft (Intake, Lager, Verkauf), Dokumentenmanagement (Angebote, Aufträge, Lieferscheine, Rechnungen, Gutschriften), Buchhaltung (Schweizer KMU-Kontenrahmen, Journaleinträge, MWST-Abrechnung), Bankabgleich und Impact-Dashboard. Es deckt den vollständigen Betriebszyklus ab.",
      },
    ],
  },
  {
    id: "kreislauf",
    title: "Kreislaufwirtschaft & Kernfunktionen",
    questions: [
      {
        q: "Was versteht Kivvi unter Kreislaufwirtschaft?",
        a: "Die Kreislaufwirtschaft umfasst alle Betriebe, die Güter nach der Erstnutzung in den Wirtschaftskreislauf zurückführen: durch Reparatur, Wiederverkauf, Umgestaltung (Upcycling) oder Teile-Harvesting. Das Gegenteil ist die Linearwirtschaft: Herstellen → Kaufen → Wegwerfen. Kreislaufbetriebe unterbrechen diesen Kreislauf und verlängern die Lebensdauer von Gütern.",
      },
      {
        q: "Wie trackt Kivvi einzelne Artikel?",
        a: "Jeder Artikel bekommt beim Eingang eine eindeutige ID und einen QR-Code. Daran hängen: Zustandsstufe (Gut/Mittel/Schlecht/Für Teile/Schrott), Seriennummer, Standort, alle Reparatureinträge mit Datum/Kosten/Stunden/Notiz, Richtpreis, Mindestpreis, Intake-Quelle (Spende/Kauf/Rücknahme/Kommission) und schliesslich Verkaufsdatum und -preis. Der vollständige Lebenslauf ist jederzeit abrufbar.",
      },
      {
        q: "Was sind die 5 Zustandsstufen?",
        a: "Gut: kaum Gebrauchsspuren, voll funktionsfähig. Mittel: sichtbare Spuren, funktioniert einwandfrei. Schlecht: deutliche Abnutzung, funktioniert. Für Teile: teilweise defekt, als Ersatzteillager geeignet. Schrott: nicht reparierbar, Recycling. Die Stufen gelten für IT, Kleidung, Möbel, Fahrräder und andere Warengruppen mit angepassten Kriterien. Die Zustandsstufe beeinflusst direkt den Richtpreis.",
      },
      {
        q: "Wie berechnet Kivvi Impact (CO₂, Geräte)?",
        a: "Das Impact-Dashboard berechnet drei Kernkennzahlen: Anzahl Artikel in neuer Nutzung (gerettete Geräte), CO₂-Einsparung in kg (Anzahl × kategoriespezifischer Faktor, z.B. Laptop ~300 kg, Jeans ~8 kg) und Anzahl bediente Personen (Transaktionen). Die CO₂-Faktoren basieren auf Lebenszyklusanalysen (Fraunhofer, Ecoinvent). Ergebnisse sind exportierbar für Förderanträge.",
      },
      {
        q: "Was sind Spendenquittungen und wie generiert Kivvi sie?",
        a: "Wenn jemand Waren spendet (statt verkauft), kann der Spender diese Zuwendung in seiner Steuererklärung abziehen — sofern Ihr Betrieb als gemeinnützig anerkannt ist. Dafür braucht er eine Spendenquittung mit Pflichtangaben (Name/Adresse Organisation und Spender, Datum, Art und Wert der Zuwendung, Bestätigung der Gemeinnützigkeit). Kivvi generiert diese Quittung beim Wareneingang automatisch als PDF — vorausgefüllt, druckbereit.",
      },
      {
        q: "Unterstützt Kivvi Kommissionsverkauf?",
        a: "Ja. Beim Kommissionsmodell liefern Privatpersonen Waren ab — der Betrieb verkauft und behält eine Provision. Kivvi erfasst den Einlieferer als Kontakt, verknüpft die Artikel, und ermöglicht die Abrechnung nach Verkauf: Was wurde verkauft? Was steht noch im Lager? Was schulden wir noch? Komplett ohne manuelle Excel-Tabellen.",
      },
    ],
  },
  {
    id: "betrieb",
    title: "Betrieb & Migration",
    questions: [
      {
        q: "Wie lange dauert die Einrichtung?",
        a: "Die initiale Einrichtung dauert etwa 10 Minuten: Firmenname, Adresse, UID-Nummer, Standard-MWST-Satz, Bank-IBAN. Danach erstellt Kivvi automatisch den Schweizer KMU-Kontenrahmen (227 Konten), 11 Nummernkreise (Rechnungen, Angebote, usw.) und das Standardlager. Sie können sofort loslegen. Eine vollständige Migration aus Kivitendo mit historischen Daten dauert je nach Datenvolumen 1–4 Stunden.",
      },
      {
        q: "Kann ich Daten aus Excel importieren?",
        a: "Ja. Kivvi importiert CSV-Dateien für Kontakte (Kunden, Lieferanten), Produkte und Dokumente (Rechnungen, Angebote). Kivvi erkennt die Spaltenstruktur automatisch und schlägt ein Mapping vor. Schweizer Zahlenformate (5'007.20) und Datumsformate (22.01.2026) werden automatisch konvertiert.",
      },
      {
        q: "Kann ich Daten aus Kivitendo importieren?",
        a: "Ja — das ist explizit unterstützt. Kivitendo-CSV-Exporte werden automatisch erkannt. Die Importreihenfolge (Kontakte → Produkte → Dokumente → Buchungen → Lagerbestände) wird von Kivvi erzwungen und dokumentiert. Nummernkreise werden nach dem Import automatisch auf das Maximum der importierten Nummern gesetzt.",
      },
      {
        q: "Funktioniert Kivvi mit Freiwilligen-Teams?",
        a: "Ja. Kivvi ist so gestaltet, dass neue Mitarbeitende und Freiwillige in 5 Minuten eingearbeitet werden können. Die häufigsten Aktionen (Wareneingang per KI-Schnelleingabe, QR scannen, Zustand bewerten, Artikel verkaufen) sind auf wenige Klicks reduziert. Komplexere Funktionen (Buchhaltung, Berichte) sind für erfahrene Nutzer vorgesehen.",
      },
      {
        q: "Gibt es Support?",
        a: "Kivvi ist Open Source — primärer Support läuft über GitHub Issues und die Community. Für Betriebe, die Kivvi einsetzen, bieten wir direkte Unterstützung per E-Mail an. Schreiben Sie uns unter info@revamp-it.ch. Für komplexe Setups oder Migrationen können wir individuelle Unterstützung anbieten.",
      },
      {
        q: "Kann ich mehrere Standorte oder Lager verwalten?",
        a: "Ja. Kivvi unterstützt mehrere Lager pro Betrieb. Artikel können zwischen Lagern transferiert werden, Lagerbestände werden pro Standort geführt. Multi-Mandanten (mehrere rechtlich unabhängige Betriebe in einer Instanz) ist ebenfalls unterstützt.",
      },
    ],
  },
  {
    id: "technik",
    title: "Technik & Compliance",
    questions: [
      {
        q: "Erstellt Kivvi Schweizer QR-Rechnungen?",
        a: "Ja. Jede Rechnung in Kivvi generiert automatisch einen gültigen Schweizer QR-Zahlschein — seit 2022 gesetzlich vorgeschrieben. Die QR-Referenz wird automatisch generiert, IBAN und Empfängerdaten aus der Firmenkonfiguration übernommen. Der Zahlschein ist im Rechnungs-PDF enthalten und kann für automatisches Zahlungsabgleich (CAMT-Import) genutzt werden.",
      },
      {
        q: "Wie berechnet Kivvi die MWST korrekt?",
        a: "Kivvi verwendet Decimal.js für alle Finanzberechnungen — keine Floating-Point-Arithmetik, keine Rundungsfehler. MWST wird pro Rechnungsposition berechnet (Schweizer Standard), nicht auf den Gesamtbetrag. CHF-Beträge werden auf 0.05 Rappen gerundet (Rappen-Rundung). MWST-Sätze (8.1%, 2.6%, 0%) kommen aus der Systemkonfiguration, nicht aus dem Code.",
      },
      {
        q: "Sind meine Daten sicher?",
        a: "Kivvi speichert Daten in einer PostgreSQL-Datenbank. Beim Self-Hosting liegt die Verantwortung für Backup, Verschlüsselung und Zugriffsschutz bei Ihnen. Für gehostete Instanzen: Daten werden in der Schweiz gespeichert, Übertragung ist TLS-verschlüsselt, Passwörter werden gehasht (nie im Klartext gespeichert), jede Firma sieht nur ihre eigenen Daten (Multi-Tenant-Isolation auf Datenbankebene).",
      },
      {
        q: "Wo werden meine Daten gespeichert?",
        a: "Beim Self-Hosting: auf Ihrem eigenen Server — Sie haben vollständige Kontrolle. Für gehostete Instanzen: in der Schweiz, bei Schweizer Rechenzentren. Es gibt keinen Datenverkauf, keine Analytics-Weitergabe an Dritte.",
      },
      {
        q: "Gibt es eine mobile App?",
        a: "Kivvi ist eine Web-App, die im Browser läuft — auf Mobilgeräten, Tablets und Desktop. Es gibt keine native iOS- oder Android-App. Die Web-App funktioniert gut auf Mobilgeräten für häufige Aktionen (QR scannen via Kamera, Artikel erfassen, Status ändern). Komplexe Buchhaltungsfunktionen sind auf grösseren Bildschirmen angenehmer.",
      },
      {
        q: "Wie funktioniert der Bankabgleich?",
        a: "Kivvi importiert CAMT.053-Dateien (Schweizer Standard für Kontoauszüge, verfügbar bei allen Schweizer Banken). Importierte Transaktionen werden automatisch mit offenen Rechnungen abgeglichen — via QR-Referenz oder Betrag+Datum. Nicht automatisch zugeordnete Transaktionen werden manuell zugewiesen.",
      },
      {
        q: "Gibt es eine API?",
        a: "Ja. Kivvi bietet eine REST-API für Kontakte, Produkte und Dokumente. Die API ist mit API-Schlüsseln abgesichert (Bearer-Token). Sie ermöglicht Integration mit externen Systemen — Webshops, Kassenterminals, Barcode-Scanner-Software. Die API-Dokumentation ist im System unter Einstellungen → API erreichbar.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_PAGE_LD) }}
      />
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Häufige Fragen
        </h1>
        <p className="text-xl text-muted-foreground">
          Alles, was Sie vor dem Start wissen wollen.
        </p>
      </section>

      {/* In-page nav */}
      <section className="mx-auto max-w-3xl py-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {FAQ_GROUPS.map((group) => (
            <a
              key={group.id}
              href={`#${group.id}`}
              className="rounded-full border bg-card px-4 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {group.title}
            </a>
          ))}
        </div>
      </section>

      {/* FAQ content */}
      <section className="mx-auto max-w-3xl py-8 space-y-16">
        {FAQ_GROUPS.map((group) => (
          <div key={group.id} id={group.id}>
            <h2 className="mb-6 text-2xl font-bold border-b pb-3">
              {group.title}
            </h2>
            <div className="space-y-6">
              {group.questions.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-2xl py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">Frage nicht gefunden?</h2>
        <p className="mb-8 text-muted-foreground">
          Schreiben Sie uns — wir antworten und ergänzen die FAQ.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Demo anfragen
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 font-medium hover:bg-muted"
          >
            Kivvi ausprobieren <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 flex justify-center gap-6 text-sm">
          <Link
            href="/why-kivvi"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Warum Kivvi →
          </Link>
          <Link
            href="/how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Wie es funktioniert →
          </Link>
          <Link
            href="/knowledge"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Wissensdatenbank →
          </Link>
        </div>
      </section>
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="mb-3 font-semibold text-base leading-snug">{q}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
    </div>
  );
}
