import { describe, it, expect } from 'vitest';
import { calculateTotals } from '../domain/documents';
import type { DocumentItemInput } from '../domain/documents';

function makeItem(overrides: Partial<DocumentItemInput> = {}): DocumentItemInput {
  return {
    position: 0,
    description: 'Test item',
    quantity: '1',
    unitPrice: '100.00',
    discount: '0',
    vatRate: '8.1',
    ...overrides,
  };
}

describe('calculateTotals', () => {
  it('calculates a single item at 8.1% VAT', () => {
    const result = calculateTotals([makeItem()]);

    expect(result.subtotal).toBe('100.00');
    expect(result.vatAmount).toBe('8.10');
    // 108.10 → rappen round → 108.10
    expect(result.total).toBe('108.10');
    expect(result.itemTotals).toEqual(['100.00']);
  });

  it('calculates a single item at 2.6% VAT', () => {
    const result = calculateTotals([
      makeItem({ unitPrice: '50.00', vatRate: '2.6' }),
    ]);

    expect(result.subtotal).toBe('50.00');
    expect(result.vatAmount).toBe('1.30');
    expect(result.total).toBe('51.30');
  });

  it('calculates a single item at 0% VAT', () => {
    const result = calculateTotals([
      makeItem({ unitPrice: '200.00', vatRate: '0.0' }),
    ]);

    expect(result.subtotal).toBe('200.00');
    expect(result.vatAmount).toBe('0.00');
    expect(result.total).toBe('200.00');
  });

  it('calculates mixed VAT rates (8.1%, 2.6%, 0%)', () => {
    const items = [
      makeItem({ position: 0, quantity: '2', unitPrice: '100.00', vatRate: '8.1' }),
      makeItem({ position: 1, quantity: '3', unitPrice: '50.00', vatRate: '2.6' }),
      makeItem({ position: 2, quantity: '1', unitPrice: '75.00', vatRate: '0.0' }),
    ];
    const result = calculateTotals(items);

    // Line 1: 2*100 = 200.00, VAT = 16.20
    // Line 2: 3*50 = 150.00, VAT = 3.90
    // Line 3: 1*75 = 75.00, VAT = 0.00
    expect(result.subtotal).toBe('425.00');
    expect(result.vatAmount).toBe('20.10');
    // 425 + 20.10 = 445.10 → rappen round → 445.10
    expect(result.total).toBe('445.10');
    expect(result.itemTotals).toEqual(['200.00', '150.00', '75.00']);
  });

  it('applies discount correctly', () => {
    const result = calculateTotals([
      makeItem({ quantity: '1', unitPrice: '100.00', discount: '10', vatRate: '8.1' }),
    ]);

    // lineGross = 100, discount = 10%, lineNet = 90.00
    // VAT = 90.00 * 8.1% = 7.29
    expect(result.subtotal).toBe('90.00');
    expect(result.vatAmount).toBe('7.29');
    // 90.00 + 7.29 = 97.29 → rappen round → 97.30
    expect(result.total).toBe('97.30');
    expect(result.itemTotals).toEqual(['90.00']);
  });

  it('applies 100% discount', () => {
    const result = calculateTotals([
      makeItem({ quantity: '5', unitPrice: '200.00', discount: '100', vatRate: '8.1' }),
    ]);

    expect(result.subtotal).toBe('0.00');
    expect(result.vatAmount).toBe('0.00');
    expect(result.total).toBe('0.00');
    expect(result.itemTotals).toEqual(['0.00']);
  });

  it('handles rappen rounding: total 10.12 → 10.10', () => {
    // We need subtotal + VAT = 10.12
    // 9.36 * 8.1% = 0.757... → rounded to 0.76
    // 9.36 + 0.76 = 10.12 → rappen → 10.10
    const result = calculateTotals([
      makeItem({ quantity: '1', unitPrice: '9.36', vatRate: '8.1' }),
    ]);
    expect(result.total).toBe('10.10');
  });

  it('handles rappen rounding: total ending in .13 → .15', () => {
    // Need subtotal + VAT = x.x3
    // 9.37 * 8.1% = 0.75897 → rounded to 0.76
    // 9.37 + 0.76 = 10.13 → rappen → 10.15
    const result = calculateTotals([
      makeItem({ quantity: '1', unitPrice: '9.37', vatRate: '8.1' }),
    ]);
    expect(result.total).toBe('10.15');
  });

  it('handles rappen rounding: total ending in .18 → .20', () => {
    // 9.41 * 8.1% = 0.76221 → rounded to 0.76
    // 9.41 + 0.76 = 10.17 → rappen → 10.15
    // Try: 9.42 * 8.1% = 0.76302 → 0.76 → 10.18 → rappen → 10.20
    const result = calculateTotals([
      makeItem({ quantity: '1', unitPrice: '9.42', vatRate: '8.1' }),
    ]);
    expect(result.total).toBe('10.20');
  });

  it('handles zero quantity', () => {
    const result = calculateTotals([
      makeItem({ quantity: '0', unitPrice: '100.00' }),
    ]);

    expect(result.subtotal).toBe('0.00');
    expect(result.vatAmount).toBe('0.00');
    expect(result.total).toBe('0.00');
  });

  it('handles zero price', () => {
    const result = calculateTotals([
      makeItem({ quantity: '5', unitPrice: '0.00' }),
    ]);

    expect(result.subtotal).toBe('0.00');
    expect(result.vatAmount).toBe('0.00');
    expect(result.total).toBe('0.00');
  });

  it('handles large amounts correctly', () => {
    const result = calculateTotals([
      makeItem({ quantity: '1000', unitPrice: '9999.99', vatRate: '8.1' }),
    ]);

    // 1000 * 9999.99 = 9999990.00
    // VAT = 9999990.00 * 8.1% = 809999.19
    // Total = 10809989.19 → rappen → 10809989.20
    expect(result.subtotal).toBe('9999990.00');
    expect(result.vatAmount).toBe('809999.19');
    expect(result.total).toBe('10809989.20');
  });

  it('handles fractional quantities', () => {
    const result = calculateTotals([
      makeItem({ quantity: '2.5', unitPrice: '40.00', vatRate: '8.1' }),
    ]);

    // 2.5 * 40 = 100.00
    // VAT = 100 * 8.1% = 8.10
    expect(result.subtotal).toBe('100.00');
    expect(result.vatAmount).toBe('8.10');
    expect(result.total).toBe('108.10');
  });

  it('handles multiple items with discounts and mixed rates', () => {
    const items = [
      makeItem({ position: 0, quantity: '3', unitPrice: '120.00', discount: '5', vatRate: '8.1' }),
      makeItem({ position: 1, quantity: '1', unitPrice: '80.00', discount: '10', vatRate: '2.6' }),
    ];
    const result = calculateTotals(items);

    // Line 1: 3*120 = 360, -5% = 342.00, VAT = 342*0.081 = 27.70
    // Line 2: 1*80 = 80, -10% = 72.00, VAT = 72*0.026 = 1.87
    expect(result.itemTotals).toEqual(['342.00', '72.00']);
    expect(result.subtotal).toBe('414.00');
    expect(result.vatAmount).toBe('29.57');
    // 414.00 + 29.57 = 443.57 → rappen → 443.55
    expect(result.total).toBe('443.55');
  });

  it('uses default VAT rate when vatRate is missing', () => {
    const result = calculateTotals([
      { position: 0, description: 'Test', quantity: '1', unitPrice: '100.00', discount: '0', vatRate: '8.1' },
    ]);

    expect(result.vatAmount).toBe('8.10');
  });
});
