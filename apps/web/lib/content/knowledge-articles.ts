/**
 * Single source of truth for knowledge base article metadata.
 *
 * - knowledge/page.tsx uses this for the article listing
 * - knowledge/[slug]/page.tsx uses this for metadata (title, tag, readTime, lead, sections)
 * - Article content (JSX) lives in [slug]/page.tsx — it uses JSX and cannot live in a .ts file
 *
 * To add an article:
 * 1. Add an entry here
 * 2. Add the content component in [slug]/page.tsx
 * That's it. Two files, one of which is a JSX component — no CMS, no database.
 */

export type KnowledgeArticleMeta = {
  slug: string;
  title: string;
  tag: string;
  readTime: string;
  /** Short excerpt shown on the listing page */
  excerpt: string;
  /** Longer lead paragraph shown at the top of the article */
  lead: string;
  /** Section headings for the table of contents */
  sections: string[];
  /** Set to false to show "Bald verfügbar" in the listing without a link */
  published: boolean;
};

export const KNOWLEDGE_ARTICLES: KnowledgeArticleMeta[] = [
  // ─── Einblicke ─────────────────────────────────────────────────────────────
  {
    slug: "kreislaufwirtschaft-software-problem",
    title: "Die Kreislaufwirtschaft hat ein Software-Problem",
    tag: "Einblicke",
    readTime: "12 min",
    excerpt:
      "62 Millionen Tonnen Elektroschrott jährlich. Ein Markt von EUR 102 Milliarden. Regulierung, die ab 2026 greift. Und kein ERP, das den Kreislauf wirklich abbildet.",
    lead: "Der Markt für Secondhand und Refurbishing wächst. Die Regulierung verschärft sich. Was fehlt, ist die Software: kein bestehendes ERP deckt den vollständigen Kreislauf von Intake bis Impact-Bericht nativ ab — und das kostet die Branche.",
    sections: [
      "Was ein Kreislaufbetrieb wirklich tut",
      "Warum jede bestehende ERP-Lösung scheitert",
      "Das regulatorische Fenster",
      "Der Impact, der sich nicht messen lässt",
      "Was gute Software für diesen Bereich bedeutet",
      "Die Chance",
    ],
    published: true,
  },
  // ─── Operational ───────────────────────────────────────────────────────────
  {
    slug: "zustandsbewertung",
    title: "Zustandsbewertung: Die 5 Stufen",
    tag: "Betrieb",
    readTime: "5 min",
    excerpt:
      "Konsistente Bewertungen sind das Fundament für faire Preise und glaubwürdige Impact-Zahlen. Die 5 Stufen mit Kriterien für IT, Kleidung, Möbel und Velos.",
    lead: "Konsistente Zustandsbewertungen sind die Grundlage für faire Preise, Kundenvertrauen und aussagekräftige Impact-Zahlen. Dieses System funktioniert für IT, Kleidung, Möbel und Fahrräder.",
    sections: [
      "Warum konsistente Bewertungen wichtig sind",
      "Die 5 Stufen",
      "Wie Zustand den Preis beeinflusst",
      "Praktische Umsetzung",
    ],
    published: true,
  },
  {
    slug: "impact-messen",
    title: "Impact messen in der Kreislaufwirtschaft",
    tag: "Impact",
    readTime: "7 min",
    excerpt:
      "CO₂-Einsparung, Geräte gerettet, Personen bedient — wie berechnet man Impact seriös? Methodik, Faktoren und Dokumentation für Förderanträge.",
    lead: "CO₂-Einsparung, Geräte gerettet, Menschen bedient — wie berechnet man Impact seriös? Methodik, Kennzahlen und Dokumentation für Förderanträge und Jahresberichte.",
    sections: [
      "Warum Impact-Zahlen wichtig sind",
      "Die drei Kernkennzahlen",
      "CO₂-Faktoren nach Kategorie (Richtwerte)",
      "Für Förderanträge",
    ],
    published: true,
  },
  {
    slug: "preisgestaltung-secondhand",
    title: "Preisgestaltung für gebrauchte Waren",
    tag: "Betrieb",
    readTime: "6 min",
    excerpt:
      "Richtpreise, Mindestpreise, Sozialrabatte — wie setzt man Preise fair und margensicher? Strategien für IT, Kleidung, Möbel und Velos.",
    lead: "Gebrauchte Waren haben keinen Listenpreis. Wie findet man Preise, die fair für Kunden, kostendeckend für den Betrieb und konsistent für das Team sind? Strategien für IT, Kleidung, Möbel und Fahrräder.",
    sections: [
      "Das Dilemma der Preisgestaltung",
      "Methoden der Preisfindung",
      "Reparaturkosten einkalkulieren",
      "Sozialrabatte: Wann und wie?",
      "Mit Kivvi Preise verwalten",
    ],
    published: true,
  },
  // ─── Compliance ────────────────────────────────────────────────────────────
  {
    slug: "spendenquittungen",
    title: "Spendenquittungen korrekt ausstellen",
    tag: "Compliance",
    readTime: "6 min",
    excerpt:
      "Was muss eine Spendenquittung in der Schweiz enthalten? Was ist steuerlich abzugsfähig? Pflichtangaben, Sachspendenbewertung und Automatisierung mit Kivvi.",
    lead: "Was muss eine Spendenquittung in der Schweiz enthalten? Was ist steuerlich abzugsfähig? Ein praxisnaher Leitfaden für Brockenhäuser und gemeinnützige Betriebe.",
    sections: [
      "Wann muss eine Quittung ausgestellt werden?",
      "Pflichtangaben auf der Quittung",
      "Sachspenden: Wert schätzen",
      "Was ist abzugsfähig?",
      "Kivvi automatisiert die Quittung",
    ],
    published: true,
  },
  {
    slug: "qr-rechnung-schweiz",
    title: "QR-Rechnung: Was Kreislaufbetriebe wissen müssen",
    tag: "Compliance",
    readTime: "5 min",
    excerpt:
      "Seit 2022 gesetzlich vorgeschrieben. Wer braucht QR-Rechnungen? Pflichtangaben, MWST-Besonderheiten, Rappen-Rundung — und wie Kivvi das automatisiert.",
    lead: "Seit 2022 gesetzlich vorgeschrieben: Rechnungen brauchen einen QR-Einzahlungsschein. Was Kreislaufbetriebe über Pflichtangaben, MWST-Besonderheiten und Rappen-Rundung wissen müssen.",
    sections: [
      "Was ist die QR-Rechnung?",
      "Wer braucht sie?",
      "Pflichtangaben",
      "MWST bei Kreislaufbetrieben",
      "Rappen-Rundung: CHF 0.05",
      "Kivvi automatisiert QR-Rechnungen",
    ],
    published: true,
  },
  // ─── Migration ─────────────────────────────────────────────────────────────
  {
    slug: "kivitendo-migration",
    title: "Von Kivitendo zu Kivvi migrieren",
    tag: "Migration",
    readTime: "8 min",
    excerpt:
      "Schritt-für-Schritt: Daten aus Kivitendo exportieren, in Kivvi importieren, Nummernkreise übernehmen. Ohne Datenverlust, ohne Engineering-Aufwand.",
    lead: "Noch in Kivitendo? So exportieren Sie Kundenstammdaten, Artikel und offene Posten — und importieren sie in wenigen Stunden in Kivvi. Kein Engineering, kein Datenverlust.",
    sections: [
      "Warum jetzt wechseln?",
      "Was wird importiert?",
      "Schritt für Schritt: Export aus Kivitendo",
      "Schritt für Schritt: Import in Kivvi",
      "Nach dem Import",
    ],
    published: true,
  },
  // ─── Customer Profiles ─────────────────────────────────────────────────────
  {
    slug: "revampit",
    title: "revamp-it Zürich: Das Referenzmodell für IT-Kreislaufwirtschaft",
    tag: "Kundentypen",
    readTime: "9 min",
    excerpt:
      "Wie Zürichs bekanntester IT-Refurbisher jährlich tausende Geräte rettet, Freiwillige koordiniert und Impact transparent macht — und warum revamp-it das Referenzmodell für Kivvi ist.",
    lead: "revamp-it ist Zürichs bekanntester IT-Refurbisher: seit über 20 Jahren retten Freiwillige und bezahlte Mitarbeitende tausende Geräte vor der Entsorgung, statten sie mit Linux aus und geben sie zu fairen Preisen weiter. revamp-it ist auch das erste Unternehmen, das Kivvi einsetzt — und damit das lebende Referenzmodell dafür, wie ein modernes ERP für die Kreislaufwirtschaft aussehen muss.",
    sections: [
      "Wer ist revamp-it?",
      "Die Organisation",
      "Ein Tag bei revamp-it",
      "Das Geschäftsmodell",
      "Was revamp-it vor Kivvi verwendete",
      "Warum revamp-it Kivvi brauchte",
      "Revamp-it als Blaupause",
    ],
    published: true,
  },
  {
    slug: "it-refurbisher",
    title: "IT-Refurbisher: Wenn Technik ein zweites Leben bekommt",
    tag: "Kundentypen",
    readTime: "8 min",
    excerpt:
      "Gebrauchte Laptops und Monitore annehmen, testen, reparieren, mit Linux ausstatten und weitergeben. Wer diese Betriebe sind, wie sie funktionieren — und warum Standard-ERPs scheitern.",
    lead: "Gebrauchte Laptops, Monitore und Drucker von Unternehmen annehmen, testen, reparieren, mit Linux ausstatten und zu fairen Preisen weitergeben — IT-Refurbisher schliessen eine Lücke zwischen Elektroschrott und digitaler Teilhabe. Und sie brauchen dafür Software, die ihre Arbeit wirklich versteht.",
    sections: [
      "Wer sind IT-Refurbisher?",
      "Die Menschen dahinter",
      "Wie ein Gerät durch den Betrieb fliesst",
      "Das Geschäftsmodell",
      "Die grössten operativen Herausforderungen",
      "Was Kivvi für IT-Refurbisher bedeutet",
    ],
    published: true,
  },
  {
    slug: "brockenhaus",
    title: "Das Brockenhaus: Secondhand im grossen Massstab",
    tag: "Kundentypen",
    readTime: "7 min",
    excerpt:
      "Täglich Dutzende Säcke Kleider, Möbel, Elektro. Gleichzeitig Verkauf, Spendenverwaltung und Sozialeinsatz. Das Brockenhaus ist Logistik, Sozialarbeit und Detailhandel in einem.",
    lead: "Täglich kommen Dutzende Säcke und Möbelstücke rein — Kleider, Geschirr, Bücher, Elektro. Gleichzeitig laufen Verkauf, Spendenverwaltung und oft ein Sozialeinsatz im gleichen Betrieb. Das Brockenhaus ist Logistik, Sozialarbeit und Detailhandel in einem.",
    sections: [
      "Was ist ein Brockenhaus?",
      "Wer arbeitet dort?",
      "Der Weg einer Spende durch den Betrieb",
      "Das Geschäftsmodell",
      "Wo Standardsoftware scheitert",
      "Was Kivvi für Brockenhäuser bedeutet",
    ],
    published: true,
  },
  {
    slug: "vintage-fachhandel",
    title: "Vintage & Fachhandel: Wenn jedes Stück eine Geschichte hat",
    tag: "Kundentypen",
    readTime: "6 min",
    excerpt:
      "Vintage-Kleidung, Instrumente, Designermöbel — im Fachhandel zählt nicht die Menge, sondern die Qualität. Jedes Stück ist einzigartig und verdient sorgfältige Dokumentation.",
    lead: "Ob Vintage-Kleidung, antiquarische Bücher, gebrauchte Musikinstrumente oder seltene Möbel — im Fachhandel für Secondhand zählt nicht die Menge, sondern die Qualität. Jedes Stück ist einzigartig, hat eine Geschichte und verdient eine sorgfältige Dokumentation.",
    sections: [
      "Was ist Vintage & Fachhandel?",
      "Wer steckt dahinter?",
      "Vom Ankauf zur Vitrine",
      "Das Geschäftsmodell",
      "Die besonderen Herausforderungen",
      "Was Kivvi für Fachhändler bedeutet",
    ],
    published: true,
  },
  {
    slug: "reparaturwerkstatt",
    title: "Reparaturwerkstatt & Repair Café: Reparieren statt wegwerfen",
    tag: "Kundentypen",
    readTime: "7 min",
    excerpt:
      "Von der professionellen Velowerkstatt bis zum wöchentlichen Repair Café: zwei sehr unterschiedliche Betriebsmodelle mit einer gemeinsamen Philosophie — und gemeinsamen operativen Herausforderungen.",
    lead: "Von der professionellen Velowerkstatt bis zum wöchentlichen Repair Café: Reparaturbetriebe verlängern die Lebensdauer von Dingen — und brauchen dafür Werkzeuge, die Aufträge, Ersatzteile, Kundenanfragen und Rechnungen im Griff behalten. Zwei sehr unterschiedliche Betriebsmodelle mit einer gemeinsamen Philosophie.",
    sections: [
      "Zwei Modelle, eine Philosophie",
      "Die Menschen in der Werkstatt",
      "Der Weg eines Auftrags",
      "Das Geschäftsmodell",
      "Wo es operativ hakt",
      "Was Kivvi für Reparaturbetriebe bedeutet",
    ],
    published: true,
  },
  {
    slug: "velofachhandel",
    title: "Gebraucht-Velohandel: Mobilität mit Geschichte",
    tag: "Kundentypen",
    readTime: "6 min",
    excerpt:
      "Der Markt für gebrauchte Fahrräder boomt. Zwischen Ankauf, Inspektion, Reparatur und Verkauf steckt ein Betrieb, der mehr mit IT-Refurbishing gemeinsam hat als mit klassischem Velohandel.",
    lead: "Der Markt für gebrauchte Fahrräder boomt. Aber zwischen Ankauf, Inspektion, Reparatur, Zertifizierung und Verkauf steckt ein Betrieb mit komplexen Anforderungen — der mehr Ähnlichkeit mit einem IT-Refurbisher hat als mit einem klassischen Velohandel.",
    sections: [
      "Wer handelt mit gebrauchten Velos?",
      "Das Team",
      "Der Lebenszyklus eines Velos",
      "Das Geschäftsmodell",
      "Die besonderen Herausforderungen",
      "Was Kivvi für den Velohandel bedeutet",
    ],
    published: true,
  },
];
