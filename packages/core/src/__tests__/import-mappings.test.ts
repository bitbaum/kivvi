import { describe, it, expect } from 'vitest';
import {
  parseSwissDate,
  parseSwissNumber,
  stripBom,
  cleanHeaders,
  mapUnit,
  applyTransform,
  applyMapping,
  detectMappingProfile,
  isSubtotalRow,
  parseKivitendoLineItems,
  KIVITENDO_CUSTOMER_PROFILE,
  KIVITENDO_VENDOR_PROFILE,
  KIVITENDO_PRODUCT_PROFILE,
  KIVITENDO_AR_INVOICE_PROFILE,
  KIVITENDO_GL_PROFILE,
  KIVITENDO_PROJECT_PROFILE,
  KIVITENDO_STOCK_PROFILE,
} from '../domain/import-mappings';

// ── parseSwissDate ──

describe('parseSwissDate', () => {
  it('parses DD.MM.YYYY format', () => {
    expect(parseSwissDate('22.01.2026')).toBe('2026-01-22');
  });

  it('parses single-digit day and month', () => {
    expect(parseSwissDate('5.3.2026')).toBe('2026-03-05');
  });

  it('returns null for empty string', () => {
    expect(parseSwissDate('')).toBeNull();
  });

  it('returns null for whitespace-only', () => {
    expect(parseSwissDate('   ')).toBeNull();
  });

  it('returns null for invalid format', () => {
    expect(parseSwissDate('2026-01-22')).toBeNull();
    expect(parseSwissDate('01/22/2026')).toBeNull();
    expect(parseSwissDate('not a date')).toBeNull();
  });

  it('trims whitespace before parsing', () => {
    expect(parseSwissDate('  15.06.2025  ')).toBe('2025-06-15');
  });

  it('pads single-digit day/month to two digits', () => {
    expect(parseSwissDate('1.1.2025')).toBe('2025-01-01');
  });
});

// ── parseSwissNumber ──

describe('parseSwissNumber', () => {
  it('strips apostrophe thousand separators', () => {
    expect(parseSwissNumber("5'007.20")).toBe('5007.20');
  });

  it('handles multiple apostrophes', () => {
    expect(parseSwissNumber("1'234'567.89")).toBe('1234567.89');
  });

  it('handles number without separators', () => {
    expect(parseSwissNumber('1234.56')).toBe('1234.56');
  });

  it('handles integer', () => {
    expect(parseSwissNumber('100')).toBe('100');
  });

  it('returns null for empty string', () => {
    expect(parseSwissNumber('')).toBeNull();
  });

  it('returns null for whitespace', () => {
    expect(parseSwissNumber('   ')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(parseSwissNumber('abc')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseSwissNumber('  42.50  ')).toBe('42.50');
  });

  it('handles zero', () => {
    expect(parseSwissNumber('0')).toBe('0');
    expect(parseSwissNumber('0.00')).toBe('0.00');
  });
});

// ── stripBom ──

describe('stripBom', () => {
  it('removes UTF-8 BOM', () => {
    expect(stripBom('\uFEFFHello')).toBe('Hello');
  });

  it('does not modify string without BOM', () => {
    expect(stripBom('Hello')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(stripBom('')).toBe('');
  });
});

// ── cleanHeaders ──

describe('cleanHeaders', () => {
  it('strips BOM from first header and trims all', () => {
    const headers = ['\uFEFF Firma ', ' Email ', ' PLZ '];
    expect(cleanHeaders(headers)).toEqual(['Firma', 'Email', 'PLZ']);
  });

  it('handles headers without BOM', () => {
    const headers = ['Name', 'Email'];
    expect(cleanHeaders(headers)).toEqual(['Name', 'Email']);
  });
});

// ── mapUnit ──

describe('mapUnit', () => {
  it('maps Stck → piece', () => {
    expect(mapUnit('Stck')).toBe('piece');
  });

  it('maps Stk → piece', () => {
    expect(mapUnit('Stk')).toBe('piece');
  });

  it('maps Std → hour', () => {
    expect(mapUnit('Std')).toBe('hour');
  });

  it('maps kg → kg', () => {
    expect(mapUnit('kg')).toBe('kg');
  });

  it('maps Liter → liter', () => {
    expect(mapUnit('Liter')).toBe('liter');
  });

  it('maps unknown → piece (default)', () => {
    expect(mapUnit('xyz')).toBe('piece');
  });

  it('handles null/undefined', () => {
    expect(mapUnit(undefined as unknown as string)).toBe('piece');
  });

  it('trims whitespace', () => {
    expect(mapUnit(' Stk ')).toBe('piece');
  });
});

// ── applyTransform ──

describe('applyTransform', () => {
  it('trim transform', () => {
    expect(applyTransform('  hello  ', 'trim')).toBe('hello');
  });

  it('swissDate transform', () => {
    expect(applyTransform('15.06.2025', 'swissDate')).toBe('2025-06-15');
  });

  it('swissNumber transform', () => {
    expect(applyTransform("1'234.56", 'swissNumber')).toBe('1234.56');
  });

  it('contactType transform returns customer', () => {
    expect(applyTransform('anything', 'contactType')).toBe('customer');
  });

  it('productType transform: D → service', () => {
    expect(applyTransform('D', 'productType')).toBe('service');
    expect(applyTransform('Dienstleistung', 'productType')).toBe('service');
  });

  it('productType transform: other → product', () => {
    expect(applyTransform('W', 'productType')).toBe('product');
    expect(applyTransform('', 'productType')).toBe('product');
  });

  it('unit transform', () => {
    expect(applyTransform('Stk', 'unit')).toBe('piece');
  });

  it('no transform returns trimmed value', () => {
    expect(applyTransform('  test  ', undefined)).toBe('test');
  });

  it('returns null for empty with no transform', () => {
    expect(applyTransform('', undefined)).toBeNull();
  });
});

// ── applyMapping ──

describe('applyMapping', () => {
  it('maps CSV row using customer profile', () => {
    const row = {
      'Firma / Kundenname': 'Acme AG',
      'E-Mail': 'info@acme.ch',
      'PLZ': '8000',
      'Stadt': 'Zürich',
    };
    const result = applyMapping(row, KIVITENDO_CUSTOMER_PROFILE);
    expect(result.name).toBe('Acme AG');
    expect(result.email).toBe('info@acme.ch');
    expect(result.postalCode).toBe('8000');
    expect(result.city).toBe('Zürich');
  });

  it('returns null for missing columns', () => {
    const row = { 'Firma / Kundenname': 'Test' };
    const result = applyMapping(row, KIVITENDO_CUSTOMER_PROFILE);
    expect(result.name).toBe('Test');
    expect(result.email).toBeNull();
  });
});

// ── detectMappingProfile ──

describe('detectMappingProfile', () => {
  it('detects customer profile', () => {
    const headers = ['Firma / Kundenname', 'Kundennummer', 'Buchungsnummer', 'E-Mail'];
    const profile = detectMappingProfile(headers);
    expect(profile).toBe(KIVITENDO_CUSTOMER_PROFILE);
  });

  it('detects vendor profile', () => {
    const headers = ['Lieferantenname', 'Lieferantennummer', 'Buchungsnummer', 'E-Mail'];
    const profile = detectMappingProfile(headers);
    expect(profile).toBe(KIVITENDO_VENDOR_PROFILE);
  });

  it('detects product profile', () => {
    const headers = ['Artikelnummer', 'Artikelbeschreibung', 'Verkaufspreis'];
    const profile = detectMappingProfile(headers);
    expect(profile).toBe(KIVITENDO_PRODUCT_PROFILE);
  });

  it('detects AR invoice profile', () => {
    const headers = ['Buchungsnummer', 'Rechnung', 'Kunde', 'Kundennummer'];
    const profile = detectMappingProfile(headers);
    expect(profile).toBe(KIVITENDO_AR_INVOICE_PROFILE);
  });

  it('detects GL profile', () => {
    const headers = ['Buchungsdatum', 'Sollkonto', 'Habenkonto', 'Soll', 'Haben'];
    const profile = detectMappingProfile(headers);
    expect(profile).toBe(KIVITENDO_GL_PROFILE);
  });

  it('detects project profile', () => {
    const headers = ['Projektnummer', 'Beschreibung', 'Projekttyp'];
    const profile = detectMappingProfile(headers);
    expect(profile).toBe(KIVITENDO_PROJECT_PROFILE);
  });

  it('detects stock profile', () => {
    const headers = ['Lager', 'Artikelnummer', 'Menge', 'Lagerplatz'];
    const profile = detectMappingProfile(headers);
    expect(profile).toBe(KIVITENDO_STOCK_PROFILE);
  });

  it('returns null for unknown headers', () => {
    const headers = ['foo', 'bar', 'baz'];
    expect(detectMappingProfile(headers)).toBeNull();
  });

  it('returns null when only 1 signature column matches', () => {
    const headers = ['Buchungsnummer', 'foo', 'bar'];
    expect(detectMappingProfile(headers)).toBeNull();
  });

  it('filters by entityType', () => {
    const headers = ['Buchungsnummer', 'Rechnung', 'Kunde', 'Kundennummer'];
    // With entityType filter for 'customer', this should not match the AR invoice profile
    const profile = detectMappingProfile(headers, 'customer');
    expect(profile).not.toBe(KIVITENDO_AR_INVOICE_PROFILE);
  });

  it('handles BOM in first header', () => {
    const headers = ['\uFEFFLieferantenname', 'Lieferantennummer', 'Buchungsnummer'];
    const profile = detectMappingProfile(headers);
    expect(profile).toBe(KIVITENDO_VENDOR_PROFILE);
  });
});

// ── isSubtotalRow ──

describe('isSubtotalRow', () => {
  it('returns true for empty key column', () => {
    expect(isSubtotalRow({ Nummer: '', Name: 'Summe' }, 'Nummer')).toBe(true);
  });

  it('returns true for whitespace-only key column', () => {
    expect(isSubtotalRow({ Nummer: '   ', Name: 'test' }, 'Nummer')).toBe(true);
  });

  it('returns false for non-empty key column', () => {
    expect(isSubtotalRow({ Nummer: 'K-00001', Name: 'Test' }, 'Nummer')).toBe(false);
  });

  it('returns true for missing key column', () => {
    expect(isSubtotalRow({ Name: 'test' }, 'Nummer')).toBe(true);
  });
});

// ── parseKivitendoLineItems ──

describe('parseKivitendoLineItems', () => {
  it('parses line items from a row', () => {
    // positionenColIndex = 2 → items start at index 2 + 6 = 8
    // Sub-header at index 3-7: Position, Artikelnummer, Beschreibung, Menge, Einheit
    // First item at index 8-12
    const row = [
      'field0', 'field1', 'Positionen text',
      'Position', 'Artikelnummer', 'Beschreibung', 'Menge', 'Einheit',
      '1', 'ART-001', 'Widget A', '5', 'Stk',
      '2', 'ART-002', 'Widget B', '10', 'kg',
      '0', '', '', '', '', // terminator
    ];
    const items = parseKivitendoLineItems(row, 2);

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      position: 1,
      articleNumber: 'ART-001',
      description: 'Widget A',
      quantity: '5',
      unit: 'Stk',
    });
    expect(items[1]).toEqual({
      position: 2,
      articleNumber: 'ART-002',
      description: 'Widget B',
      quantity: '10',
      unit: 'kg',
    });
  });

  it('returns empty array if no items after header', () => {
    const row = ['field0', 'field1', 'Positionen text', 'Position', 'Artikelnummer', 'Beschreibung', 'Menge', 'Einheit'];
    expect(parseKivitendoLineItems(row, 2)).toEqual([]);
  });

  it('stops at terminator position 0', () => {
    const row = [
      'f0', 'f1', 'pos',
      'Position', 'Art', 'Desc', 'Menge', 'Einheit',
      '1', 'A', 'Item 1', '3', 'Stk',
      '0', '', '', '', '',
      '99', 'B', 'Should not appear', '1', 'Stk',
    ];
    const items = parseKivitendoLineItems(row, 2);
    expect(items).toHaveLength(1);
  });

  it('stops at empty position', () => {
    const row = [
      'f0', 'f1', 'pos',
      'Position', 'Art', 'Desc', 'Menge', 'Einheit',
      '1', 'A', 'Item 1', '3', 'Stk',
      '', '', '', '', '',
    ];
    const items = parseKivitendoLineItems(row, 2);
    expect(items).toHaveLength(1);
  });

  it('returns empty array if row is too short', () => {
    const row = ['f0', 'f1', 'pos'];
    expect(parseKivitendoLineItems(row, 2)).toEqual([]);
  });
});
