export const PARTICIPANTS = [
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

export const BUSINESS_MODELS = [
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

export const DIMENSIONS = [
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
