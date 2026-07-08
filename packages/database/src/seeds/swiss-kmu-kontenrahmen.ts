/**
 * Swiss KMU Kontenrahmen (SME Chart of Accounts)
 * Based on the standard Swiss chart of accounts for small and medium enterprises.
 *
 * Structure:
 * 1xxx — Assets (Aktiven)
 * 2xxx — Liabilities & Equity (Passiven)
 * 3xxx — Revenue (Betriebsertrag)
 * 4xxx — Cost of Goods Sold (Aufwand für Material, Waren, Dienstleistungen)
 * 5xxx — Personnel Expenses (Personalaufwand)
 * 6xxx — Other Operating Expenses (Übriger betrieblicher Aufwand)
 * 7xxx — Non-operating Results (Betriebsfremder Aufwand/Ertrag)
 * 8xxx — Extraordinary Results (Ausserordentlicher Aufwand/Ertrag)
 * 9xxx — Closing Accounts (Abschluss)
 */

import type { AccountType } from "../schema";

export interface SeedAccount {
  code: string;
  name: string;
  type: AccountType;
}

export const SWISS_KMU_ACCOUNTS: SeedAccount[] = [
  // =========================================================================
  // 1xxx — ASSETS (Aktiven)
  // =========================================================================

  // 10xx — Current Assets: Liquid Funds (Umlaufvermögen: Flüssige Mittel)
  { code: "1000", name: "Kasse", type: "asset" },
  { code: "1010", name: "Post", type: "asset" },
  { code: "1020", name: "Bank", type: "asset" },
  { code: "1030", name: "Bankkonto CHF", type: "asset" },
  { code: "1040", name: "Bankkonto EUR", type: "asset" },
  { code: "1050", name: "Bankkonto USD", type: "asset" },
  { code: "1060", name: "Kurzfristige Geldanlagen", type: "asset" },

  // 11xx — Current Assets: Receivables (Forderungen)
  {
    code: "1100",
    name: "Forderungen aus Lieferungen und Leistungen (Debitoren)",
    type: "asset",
  },
  {
    code: "1109",
    name: "Delkredere (Wertberichtigung Forderungen)",
    type: "asset",
  },
  { code: "1140", name: "Vorschüsse und Darlehen", type: "asset" },
  { code: "1170", name: "Vorsteuer auf Materialaufwand und DL", type: "asset" },
  {
    code: "1171",
    name: "Vorsteuer auf Investitionen und übrigem Aufwand",
    type: "asset",
  },
  { code: "1176", name: "Verrechnungssteuer", type: "asset" },
  { code: "1180", name: "Sonstige kurzfristige Forderungen", type: "asset" },
  {
    code: "1190",
    name: "Aktive Rechnungsabgrenzung (Transitorische Aktiven)",
    type: "asset",
  },

  // 12xx — Current Assets: Inventory (Vorräte)
  { code: "1200", name: "Handelswaren", type: "asset" },
  { code: "1210", name: "Rohstoffe", type: "asset" },
  { code: "1220", name: "Halbfabrikate", type: "asset" },
  { code: "1230", name: "Fertigfabrikate", type: "asset" },
  {
    code: "1250",
    name: "Angefangene Arbeiten (nicht fakturierte DL)",
    type: "asset",
  },
  { code: "1260", name: "Fertige Erzeugnisse", type: "asset" },
  { code: "1280", name: "Wertberichtigung Vorräte", type: "asset" },

  // 14xx — Fixed Assets (Anlagevermögen)
  { code: "1400", name: "Wertschriften", type: "asset" },
  { code: "1440", name: "Darlehen", type: "asset" },
  { code: "1480", name: "Beteiligungen", type: "asset" },

  // 15xx — Fixed Assets: Tangible (Sachanlagen)
  { code: "1500", name: "Maschinen und Apparate", type: "asset" },
  { code: "1509", name: "WB Maschinen und Apparate", type: "asset" },
  { code: "1510", name: "Mobiliar und Einrichtungen", type: "asset" },
  { code: "1519", name: "WB Mobiliar und Einrichtungen", type: "asset" },
  { code: "1520", name: "Büromaschinen und Informatik", type: "asset" },
  { code: "1529", name: "WB Büromaschinen und Informatik", type: "asset" },
  { code: "1530", name: "Fahrzeuge", type: "asset" },
  { code: "1539", name: "WB Fahrzeuge", type: "asset" },
  { code: "1540", name: "Werkzeuge und Geräte", type: "asset" },
  { code: "1549", name: "WB Werkzeuge und Geräte", type: "asset" },

  // 16xx — Fixed Assets: Real Estate (Immobilien)
  { code: "1600", name: "Geschäftsliegenschaften", type: "asset" },
  { code: "1609", name: "WB Geschäftsliegenschaften", type: "asset" },

  // 17xx — Intangible Assets (Immaterielle Anlagen)
  { code: "1700", name: "Patente, Lizenzen", type: "asset" },
  { code: "1770", name: "Goodwill", type: "asset" },

  // =========================================================================
  // 2xxx — LIABILITIES & EQUITY (Passiven)
  // =========================================================================

  // 20xx — Current Liabilities (Kurzfristiges Fremdkapital)
  {
    code: "2000",
    name: "Verbindlichkeiten aus Lieferungen und Leistungen (Kreditoren)",
    type: "liability",
  },
  { code: "2030", name: "Erhaltene Anzahlungen", type: "liability" },
  { code: "2050", name: "Kontokorrent Bank (kurzfristig)", type: "liability" },
  { code: "2110", name: "Fällige MWST (Abrechnungskonto)", type: "liability" },
  { code: "2120", name: "Direkte Steuern", type: "liability" },
  {
    code: "2140",
    name: "Übrige kurzfristige Verbindlichkeiten",
    type: "liability",
  },
  { code: "2160", name: "AHV, IV, EO, ALV", type: "liability" },
  { code: "2170", name: "Pensionskasse BVG", type: "liability" },
  { code: "2180", name: "Unfallversicherung UVG", type: "liability" },
  { code: "2200", name: "Geschuldete MWST (Umsatzsteuer)", type: "liability" },
  { code: "2210", name: "Kurzfristige Rückstellungen", type: "liability" },
  {
    code: "2260",
    name: "Kurzfristige Bankverbindlichkeiten",
    type: "liability",
  },
  {
    code: "2300",
    name: "Passive Rechnungsabgrenzung (Transitorische Passiven)",
    type: "liability",
  },

  // 24xx — Long-term Liabilities (Langfristiges Fremdkapital)
  {
    code: "2400",
    name: "Langfristige Bankverbindlichkeiten",
    type: "liability",
  },
  { code: "2420", name: "Hypotheken", type: "liability" },
  { code: "2450", name: "Darlehen", type: "liability" },
  { code: "2500", name: "Langfristige Rückstellungen", type: "liability" },

  // 28xx — Equity (Eigenkapital)
  { code: "2800", name: "Eigenkapital / Stammkapital", type: "equity" },
  { code: "2850", name: "Reserven / Kapitalreserven", type: "equity" },
  { code: "2900", name: "Gewinnvortrag / Verlustvortrag", type: "equity" },
  { code: "2950", name: "Jahresgewinn / Jahresverlust", type: "equity" },
  { code: "2970", name: "Privat (Einzelfirma)", type: "equity" },
  { code: "2979", name: "Privat Bezüge", type: "equity" },
  { code: "2980", name: "Privat Einlagen", type: "equity" },

  // =========================================================================
  // 3xxx — REVENUE (Betriebsertrag aus Lieferungen und Leistungen)
  // =========================================================================

  { code: "3000", name: "Produktionserlöse / Handelserlöse", type: "revenue" },
  { code: "3200", name: "Dienstleistungserlöse", type: "revenue" },
  { code: "3400", name: "Übrige Erlöse", type: "revenue" },
  {
    code: "3600",
    name: "Bestandesänderungen Halb- und Fertigfabrikate",
    type: "revenue",
  },
  { code: "3700", name: "Eigenleistungen", type: "revenue" },
  { code: "3800", name: "Erlösminderungen (Skonti, Rabatte)", type: "revenue" },
  { code: "3805", name: "Verluste aus Forderungen", type: "revenue" },
  { code: "3900", name: "Nicht fakturierte Dienstleistungen", type: "revenue" },

  // =========================================================================
  // 4xxx — COST OF GOODS SOLD (Aufwand für Material, Waren, Dienstleistungen)
  // =========================================================================

  { code: "4000", name: "Materialaufwand", type: "expense" },
  { code: "4200", name: "Handelswarenaufwand", type: "expense" },
  {
    code: "4400",
    name: "Aufwand für bezogene Drittleistungen",
    type: "expense",
  },
  { code: "4500", name: "Energieaufwand (Produktion)", type: "expense" },
  { code: "4900", name: "Bestandesänderungen", type: "expense" },

  // =========================================================================
  // 5xxx — PERSONNEL EXPENSES (Personalaufwand)
  // =========================================================================

  { code: "5000", name: "Lohnaufwand", type: "expense" },
  { code: "5200", name: "AHV, IV, EO, ALV", type: "expense" },
  { code: "5210", name: "Pensionskasse BVG", type: "expense" },
  { code: "5220", name: "Unfallversicherung UVG", type: "expense" },
  { code: "5230", name: "Krankentaggeldversicherung KTG", type: "expense" },
  { code: "5240", name: "Familienzulagen FAK", type: "expense" },
  { code: "5250", name: "Quellensteuer", type: "expense" },
  { code: "5260", name: "Übriger Sozialversicherungsaufwand", type: "expense" },
  { code: "5800", name: "Übriger Personalaufwand", type: "expense" },
  { code: "5810", name: "Ausbildung und Weiterbildung", type: "expense" },
  { code: "5820", name: "Spesen", type: "expense" },
  { code: "5830", name: "Personalanlässe", type: "expense" },
  { code: "5880", name: "Sonstiger Personalaufwand", type: "expense" },
  { code: "5900", name: "Leistungen Dritter (Temporär)", type: "expense" },

  // =========================================================================
  // 6xxx — OTHER OPERATING EXPENSES (Übriger betrieblicher Aufwand)
  // =========================================================================

  { code: "6000", name: "Raumaufwand (Miete)", type: "expense" },
  { code: "6010", name: "Nebenkosten Räumlichkeiten", type: "expense" },
  { code: "6050", name: "Reinigung", type: "expense" },
  {
    code: "6100",
    name: "Unterhalt, Reparaturen, Ersatz (Mobiliar)",
    type: "expense",
  },
  {
    code: "6105",
    name: "Unterhalt, Reparaturen, Ersatz (Werkzeuge)",
    type: "expense",
  },
  { code: "6110", name: "Leasingaufwand Fahrzeuge", type: "expense" },
  { code: "6120", name: "Fahrzeugaufwand", type: "expense" },
  { code: "6130", name: "Sachversicherungen", type: "expense" },
  { code: "6200", name: "Abschreibungen auf Sachanlagen", type: "expense" },
  {
    code: "6210",
    name: "Abschreibungen Mobiliar und Einrichtungen",
    type: "expense",
  },
  {
    code: "6220",
    name: "Abschreibungen Büromaschinen und Informatik",
    type: "expense",
  },
  { code: "6230", name: "Abschreibungen Fahrzeuge", type: "expense" },
  { code: "6260", name: "Abschreibungen Immobilien", type: "expense" },
  { code: "6300", name: "Energie- und Entsorgungsaufwand", type: "expense" },
  { code: "6400", name: "Verwaltungsaufwand", type: "expense" },
  { code: "6410", name: "Telefon / Internet", type: "expense" },
  { code: "6420", name: "Porto", type: "expense" },
  { code: "6430", name: "Drucksachen", type: "expense" },
  { code: "6440", name: "Büromaterial", type: "expense" },
  { code: "6450", name: "Fachliteratur", type: "expense" },
  { code: "6460", name: "Software und Lizenzen", type: "expense" },
  { code: "6500", name: "Werbeaufwand", type: "expense" },
  { code: "6510", name: "Inserate / Werbung", type: "expense" },
  { code: "6520", name: "Repräsentationsaufwand", type: "expense" },
  { code: "6530", name: "Spenden", type: "expense" },
  {
    code: "6540",
    name: "Mitgliederbeiträge und Verbandsbeiträge",
    type: "expense",
  },
  { code: "6570", name: "Reisespesen", type: "expense" },
  { code: "6580", name: "Kundenbetreuung", type: "expense" },
  { code: "6600", name: "Übriger betrieblicher Aufwand", type: "expense" },
  {
    code: "6700",
    name: "Beratungsaufwand (Treuhänder, Rechtsanwalt)",
    type: "expense",
  },
  { code: "6800", name: "Finanzaufwand (Bankspesen)", type: "expense" },
  { code: "6810", name: "Zinsaufwand", type: "expense" },
  { code: "6840", name: "Kursverluste", type: "expense" },
  { code: "6850", name: "Rundungsdifferenzen", type: "expense" },
  { code: "6900", name: "Finanzertrag", type: "revenue" },
  { code: "6910", name: "Zinsertrag", type: "revenue" },
  { code: "6940", name: "Kursgewinne", type: "revenue" },
  { code: "6950", name: "Wertschriftenerträge", type: "revenue" },

  // =========================================================================
  // 7xxx — NON-OPERATING RESULTS (Betriebsfremder Aufwand/Ertrag)
  // =========================================================================

  {
    code: "7000",
    name: "Betriebsfremder Aufwand Liegenschaften",
    type: "expense",
  },
  {
    code: "7010",
    name: "Betriebsfremder Ertrag Liegenschaften",
    type: "revenue",
  },
  { code: "7500", name: "Betriebsfremder Aufwand", type: "expense" },
  { code: "7510", name: "Betriebsfremder Ertrag", type: "revenue" },

  // =========================================================================
  // 8xxx — EXTRAORDINARY RESULTS (Ausserordentlicher Aufwand/Ertrag)
  // =========================================================================

  { code: "8000", name: "Ausserordentlicher Aufwand", type: "expense" },
  { code: "8100", name: "Ausserordentlicher Ertrag", type: "revenue" },
  { code: "8500", name: "Steuern (direkte)", type: "expense" },
  { code: "8510", name: "Kapitalsteuern", type: "expense" },

  // =========================================================================
  // 9xxx — CLOSING ACCOUNTS (Abschluss)
  // =========================================================================

  { code: "9000", name: "Eröffnungsbilanzkonto", type: "equity" },
  { code: "9100", name: "Schlussbilanzkonto", type: "equity" },
  { code: "9200", name: "Gewinn- und Verlustrechnung", type: "equity" },
];
