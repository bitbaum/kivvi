// ============================================================================
// IMPORT MAPPING PROFILES
// ============================================================================
// Maps CSV column names from kivitendo exports to kivvi field names.
// Each profile defines: sourceColumn → targetField mappings.

export interface MappingField {
  source: string;
  target: string;
  transform?: 'swissDate' | 'swissNumber' | 'trim' | 'contactType' | 'productType' | 'unit';
}

export interface MappingProfile {
  name: string;
  entityType: string;
  fields: MappingField[];
  /** Column names that identify this profile (for auto-detection) */
  signatureColumns: string[];
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

/** Parse Swiss date "22.01.2026" → "2026-01-22" */
export function parseSwissDate(value: string): string | null {
  if (!value || !value.trim()) return null;
  const cleaned = value.trim();
  const match = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/** Parse Swiss number "5'007.20" → "5007.20" (strip apostrophe thousand separators) */
export function parseSwissNumber(value: string): string | null {
  if (!value || !value.trim()) return null;
  const cleaned = value.trim().replace(/'/g, '');
  if (cleaned === '' || isNaN(Number(cleaned))) return null;
  return cleaned;
}

/** Strip BOM marker from string */
export function stripBom(str: string): string {
  return str.replace(/^\uFEFF/, '');
}

/** Clean CSV headers: strip BOM, trim whitespace */
export function cleanHeaders(headers: string[]): string[] {
  return headers.map((h, i) => {
    let cleaned = i === 0 ? stripBom(h) : h;
    return cleaned.trim();
  });
}

/** Map unit from kivitendo to kivvi */
export function mapUnit(value: string): string {
  const unitMap: Record<string, string> = {
    'Stck': 'piece',
    'Stk': 'piece',
    'Std': 'hour',
    'kg': 'kg',
    'm': 'm',
    'm2': 'm2',
    'm3': 'm3',
    'Liter': 'liter',
    'l': 'liter',
    'Mt': 'piece', // months → treat as piece
    'Pauschal': 'piece',
    'psch': 'piece',
    'Jahr': 'piece',
    'Tag': 'piece',
  };
  return unitMap[value?.trim()] || 'piece';
}

/** Apply a transform to a value */
export function applyTransform(
  value: string,
  transform?: MappingField['transform']
): string | null {
  if (!transform) return value?.trim() || null;

  switch (transform) {
    case 'swissDate':
      return parseSwissDate(value);
    case 'swissNumber':
      return parseSwissNumber(value);
    case 'trim':
      return value?.trim() || null;
    case 'contactType':
      return 'customer'; // default, overridden per profile
    case 'productType': {
      const v = value?.trim()?.toUpperCase();
      if (v === 'D' || v === 'DIENSTLEISTUNG') return 'service';
      return 'product';
    }
    case 'unit':
      return mapUnit(value);
    default:
      return value?.trim() || null;
  }
}

/**
 * Apply a mapping profile to a row of CSV data.
 * Returns an object with target field names as keys.
 */
export function applyMapping(
  row: Record<string, string>,
  profile: MappingProfile
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const field of profile.fields) {
    const rawValue = row[field.source] ?? '';
    result[field.target] = applyTransform(rawValue, field.transform);
  }
  return result;
}

// ============================================================================
// MAPPING PROFILES
// ============================================================================

export const KIVITENDO_CUSTOMER_PROFILE: MappingProfile = {
  name: 'Kivitendo Customers',
  entityType: 'customer',
  signatureColumns: ['Firma / Kundenname', 'Kundennummer', 'Buchungsnummer'],
  fields: [
    { source: 'Firma / Kundenname', target: 'name', transform: 'trim' },
    { source: 'Nummer', target: 'contactNumber', transform: 'trim' },
    { source: 'Kontakt', target: 'firstName', transform: 'trim' },
    { source: 'E-Mail', target: 'email', transform: 'trim' },
    { source: 'Telefon', target: 'phone', transform: 'trim' },
    { source: 'Straße', target: 'address', transform: 'trim' },
    { source: 'PLZ', target: 'postalCode', transform: 'trim' },
    { source: 'Stadt', target: 'city', transform: 'trim' },
    { source: 'Land', target: 'country', transform: 'trim' },
    { source: 'USt-IdNr.', target: 'vatNumber', transform: 'trim' },
    { source: 'Fax', target: 'notes', transform: 'trim' },
    { source: 'Kreditlimit', target: 'creditLimit', transform: 'swissNumber' },
    { source: 'Buchungsnummer', target: 'kivitendoId', transform: 'trim' },
  ],
};

export const KIVITENDO_VENDOR_PROFILE: MappingProfile = {
  name: 'Kivitendo Vendors',
  entityType: 'vendor',
  signatureColumns: ['Lieferantenname', 'Lieferantennummer', 'Buchungsnummer'],
  fields: [
    { source: 'Lieferantenname', target: 'name', transform: 'trim' },
    { source: 'Nummer', target: 'contactNumber', transform: 'trim' },
    { source: 'Kontakt', target: 'firstName', transform: 'trim' },
    { source: 'E-Mail', target: 'email', transform: 'trim' },
    { source: 'Telefon', target: 'phone', transform: 'trim' },
    { source: 'Straße', target: 'address', transform: 'trim' },
    { source: 'PLZ', target: 'postalCode', transform: 'trim' },
    { source: 'Stadt', target: 'city', transform: 'trim' },
    { source: 'Land', target: 'country', transform: 'trim' },
    { source: 'USt-IdNr.', target: 'vatNumber', transform: 'trim' },
    { source: 'Buchungsnummer', target: 'kivitendoId', transform: 'trim' },
  ],
};

export const KIVITENDO_PRODUCT_PROFILE: MappingProfile = {
  name: 'Kivitendo Products',
  entityType: 'product',
  signatureColumns: ['Artikelnummer', 'Artikelbeschreibung', 'Verkaufspreis'],
  fields: [
    { source: 'Artikelnummer', target: 'articleNumber', transform: 'trim' },
    { source: 'Artikelbeschreibung', target: 'name', transform: 'trim' },
    { source: 'Typ', target: 'type', transform: 'productType' },
    { source: 'Verkaufspreis', target: 'unitPrice', transform: 'swissNumber' },
    { source: 'Einkaufspreis', target: 'purchasePrice', transform: 'swissNumber' },
    { source: 'Einheit', target: 'unit', transform: 'unit' },
    { source: 'Warengruppe', target: 'productGroup', transform: 'trim' },
    { source: 'Hersteller', target: 'manufacturer', transform: 'trim' },
    { source: 'EAN', target: 'ean', transform: 'trim' },
    { source: 'Gewicht', target: 'weight', transform: 'swissNumber' },
    { source: 'Mindestlagerbestand', target: 'minStock', transform: 'swissNumber' },
    { source: 'Lagermenge', target: 'stockQuantity', transform: 'swissNumber' },
    { source: 'Bemerkungen', target: 'description', transform: 'trim' },
    { source: 'Listenpreis', target: 'listPrice', transform: 'swissNumber' },
    { source: 'Shopartikel', target: 'shopVisible', transform: 'trim' },
  ],
};

export const KIVITENDO_AR_INVOICE_PROFILE: MappingProfile = {
  name: 'Kivitendo Sales Invoices',
  entityType: 'invoice',
  signatureColumns: ['Buchungsnummer', 'Rechnung', 'Kunde', 'Kundennummer'],
  fields: [
    { source: 'Buchungsnummer', target: 'number', transform: 'trim' },
    { source: 'Rechnung', target: 'legacyNumber', transform: 'trim' },
    { source: 'Datum', target: 'issueDate', transform: 'swissDate' },
    { source: 'Fälligkeitsdatum', target: 'dueDate', transform: 'swissDate' },
    { source: 'Lieferdatum', target: 'deliveryDate', transform: 'swissDate' },
    { source: 'Kundennummer', target: 'contactNumber', transform: 'trim' },
    { source: 'Kunde', target: 'contactName', transform: 'trim' },
    { source: 'Betrag', target: 'subtotal', transform: 'swissNumber' },
    { source: 'Steuer', target: 'vatAmount', transform: 'swissNumber' },
    { source: 'Summe', target: 'total', transform: 'swissNumber' },
    { source: 'bezahlt', target: 'paidAmount', transform: 'swissNumber' },
    { source: 'Zahlungsdatum', target: 'paidDate', transform: 'swissDate' },
    { source: 'Bemerkungen', target: 'notes', transform: 'trim' },
    { source: 'Positionen', target: 'positions', transform: 'trim' },
    { source: 'Steuersatz', target: 'vatRate', transform: 'swissNumber' },
    { source: 'Auftrag', target: 'orderNumber', transform: 'trim' },
  ],
};

export const KIVITENDO_AP_INVOICE_PROFILE: MappingProfile = {
  name: 'Kivitendo Purchase Invoices',
  entityType: 'purchase_invoice',
  signatureColumns: ['Buchungsnummer', 'Rechnung', 'Lieferant', 'Lieferantennummer'],
  fields: [
    { source: 'Buchungsnummer', target: 'number', transform: 'trim' },
    { source: 'Rechnung', target: 'legacyNumber', transform: 'trim' },
    { source: 'Datum', target: 'issueDate', transform: 'swissDate' },
    { source: 'Fälligkeitsdatum', target: 'dueDate', transform: 'swissDate' },
    { source: 'Lieferantennummer', target: 'contactNumber', transform: 'trim' },
    { source: 'Lieferant', target: 'contactName', transform: 'trim' },
    { source: 'Betrag', target: 'subtotal', transform: 'swissNumber' },
    { source: 'Steuer', target: 'vatAmount', transform: 'swissNumber' },
    { source: 'Summe', target: 'total', transform: 'swissNumber' },
    { source: 'bezahlt', target: 'paidAmount', transform: 'swissNumber' },
    { source: 'Zahlungsdatum', target: 'paidDate', transform: 'swissDate' },
    { source: 'Bemerkungen', target: 'notes', transform: 'trim' },
    { source: 'Positionen', target: 'positions', transform: 'trim' },
    { source: 'Steuersatz', target: 'vatRate', transform: 'swissNumber' },
  ],
};

export const KIVITENDO_GL_PROFILE: MappingProfile = {
  name: 'Kivitendo General Ledger',
  entityType: 'journal_entry',
  signatureColumns: ['Buchungsdatum', 'Sollkonto', 'Habenkonto', 'Soll', 'Haben'],
  fields: [
    { source: 'Buchungsdatum', target: 'date', transform: 'swissDate' },
    { source: 'Buchungsnummer', target: 'reference', transform: 'trim' },
    { source: 'Beschreibung', target: 'description', transform: 'trim' },
    { source: 'Bemerkungen', target: 'notes', transform: 'trim' },
    { source: 'Soll', target: 'debitAmount', transform: 'swissNumber' },
    { source: 'Sollkonto', target: 'debitAccount', transform: 'trim' },
    { source: 'Haben', target: 'creditAmount', transform: 'swissNumber' },
    { source: 'Habenkonto', target: 'creditAccount', transform: 'trim' },
    { source: 'Beleg', target: 'voucher', transform: 'trim' },
  ],
};

export const KIVITENDO_STOCK_PROFILE: MappingProfile = {
  name: 'Kivitendo Stock Levels',
  entityType: 'stock',
  signatureColumns: ['Lager', 'Artikelnummer', 'Menge', 'Lagerplatz'],
  fields: [
    { source: 'Artikelnummer', target: 'articleNumber', transform: 'trim' },
    { source: 'Menge', target: 'quantity', transform: 'swissNumber' },
    { source: 'Lager', target: 'warehouse', transform: 'trim' },
    { source: 'Lagerplatz', target: 'location', transform: 'trim' },
    { source: 'Artikelbeschreibung', target: 'productName', transform: 'trim' },
  ],
};

// All profiles for auto-detection
const ALL_PROFILES: MappingProfile[] = [
  KIVITENDO_CUSTOMER_PROFILE,
  KIVITENDO_VENDOR_PROFILE,
  KIVITENDO_PRODUCT_PROFILE,
  KIVITENDO_AR_INVOICE_PROFILE,
  KIVITENDO_AP_INVOICE_PROFILE,
  KIVITENDO_GL_PROFILE,
  KIVITENDO_STOCK_PROFILE,
];

/**
 * Auto-detect which mapping profile matches the given CSV headers.
 * Scores each profile by how many signature columns match.
 * Optionally filter by entityType.
 */
export function detectMappingProfile(
  headers: string[],
  entityType?: string
): MappingProfile | null {
  const cleanedHeaders = cleanHeaders(headers);

  let candidates = ALL_PROFILES;
  if (entityType) {
    candidates = candidates.filter((p) => p.entityType === entityType);
  }

  let bestProfile: MappingProfile | null = null;
  let bestScore = 0;

  for (const profile of candidates) {
    const score = profile.signatureColumns.filter((sig) =>
      cleanedHeaders.some((h) => h === sig)
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }

  // Require at least 2 matching signature columns
  return bestScore >= 2 ? bestProfile : null;
}

/**
 * Check if a row is a subtotal/empty row that should be filtered out.
 * Kivitendo sometimes exports subtotal rows with empty key columns.
 */
export function isSubtotalRow(row: Record<string, string>, keyColumn: string): boolean {
  const value = row[keyColumn];
  return !value || value.trim() === '';
}

// ============================================================================
// KIVITENDO LINE ITEM PARSING (from extra CSV columns)
// ============================================================================

export interface ParsedLineItem {
  position: number;
  articleNumber: string;
  description: string;
  quantity: string;
  unit: string;
}

/**
 * Parse structured line items from a raw Kivitendo CSV row.
 *
 * Kivitendo exports put line items as EXTRA COLUMNS beyond the CSV header.
 * After the "Positionen" text column, the row contains:
 *   - 5-column sub-header: "Position", "Artikelnummer", "Beschreibung", "Menge", "Einheit"
 *   - Repeating groups of 5: (position#, articleNumber, description, quantity, unit)
 *   - Terminator: position "0" or empty
 *
 * @param row - Raw CSV row as string array (parsed without headers)
 * @param positionenColIndex - 0-based index of the "Positionen" text column
 * @returns Parsed line items array (empty if no items found)
 */
export function parseKivitendoLineItems(
  row: string[],
  positionenColIndex: number
): ParsedLineItem[] {
  const items: ParsedLineItem[] = [];

  // Items start after: Positionen col + 5-col sub-header
  const startIndex = positionenColIndex + 6;

  if (row.length <= startIndex) return items;

  for (let i = startIndex; i + 4 < row.length; i += 5) {
    const posStr = row[i]?.trim();

    // Stop at terminator: position "0" or empty
    if (!posStr || posStr === '0') break;

    const posNum = parseInt(posStr, 10);
    if (isNaN(posNum) || posNum <= 0) break;

    items.push({
      position: posNum,
      articleNumber: row[i + 1]?.trim() || '',
      description: row[i + 2]?.trim() || '',
      quantity: row[i + 3]?.trim() || '0',
      unit: row[i + 4]?.trim() || '',
    });
  }

  return items;
}
