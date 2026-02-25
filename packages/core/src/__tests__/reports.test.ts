import { describe, it, expect } from 'vitest';
import {
  computeVatAmount,
  classifyAgingBucket,
  computeDaysOverdue,
  computeProfitLossTotals,
  computeRetainedEarnings,
  mergeSalesRows,
  computeSalesTotals,
} from '../domain/reports';

// ============================================================================
// computeVatAmount
// ============================================================================

describe('computeVatAmount', () => {
  it('computes 8.1% VAT (Swiss standard rate)', () => {
    expect(computeVatAmount('1000.00', '8.1')).toBe(81);
  });

  it('computes 2.6% VAT (Swiss reduced rate)', () => {
    expect(computeVatAmount('1000.00', '2.6')).toBe(26);
  });

  it('computes 0% VAT', () => {
    expect(computeVatAmount('5000.00', '0')).toBe(0);
  });

  it('handles fractional taxable amounts correctly', () => {
    // 123.45 * 8.1% = 9.99945
    expect(computeVatAmount('123.45', '8.1')).toBeCloseTo(9.99945, 5);
  });

  it('handles large amounts without floating-point errors', () => {
    // 999999.99 * 8.1% = 80999.99919
    const result = computeVatAmount('999999.99', '8.1');
    expect(result).toBeCloseTo(80999.99919, 4);
  });

  it('handles zero taxable amount', () => {
    expect(computeVatAmount('0', '8.1')).toBe(0);
  });

  it('handles negative taxable amount (credit notes)', () => {
    // Credit notes have negative amounts
    expect(computeVatAmount('-500.00', '8.1')).toBe(-40.5);
  });

  it('computes correctly for small amounts', () => {
    // 1.00 * 8.1% = 0.081
    expect(computeVatAmount('1.00', '8.1')).toBeCloseTo(0.081, 5);
  });
});

// ============================================================================
// classifyAgingBucket
// ============================================================================

describe('classifyAgingBucket', () => {
  it('not yet due (negative days) → current', () => {
    expect(classifyAgingBucket(-10)).toBe('current');
  });

  it('due today (0 days) → current', () => {
    expect(classifyAgingBucket(0)).toBe('current');
  });

  it('1 day overdue → days30', () => {
    expect(classifyAgingBucket(1)).toBe('days30');
  });

  it('30 days overdue → days30', () => {
    expect(classifyAgingBucket(30)).toBe('days30');
  });

  it('31 days overdue → days60', () => {
    expect(classifyAgingBucket(31)).toBe('days60');
  });

  it('60 days overdue → days60', () => {
    expect(classifyAgingBucket(60)).toBe('days60');
  });

  it('61 days overdue → days90', () => {
    expect(classifyAgingBucket(61)).toBe('days90');
  });

  it('90 days overdue → days90', () => {
    expect(classifyAgingBucket(90)).toBe('days90');
  });

  it('91 days overdue → over90', () => {
    expect(classifyAgingBucket(91)).toBe('over90');
  });

  it('365 days overdue → over90', () => {
    expect(classifyAgingBucket(365)).toBe('over90');
  });
});

// ============================================================================
// computeDaysOverdue
// ============================================================================

describe('computeDaysOverdue', () => {
  it('returns 0 when due date equals as-of date', () => {
    expect(computeDaysOverdue('2026-01-15', '2026-01-15')).toBe(0);
  });

  it('returns positive for overdue invoices', () => {
    expect(computeDaysOverdue('2026-01-01', '2026-01-31')).toBe(30);
  });

  it('returns negative for not-yet-due invoices', () => {
    expect(computeDaysOverdue('2026-02-15', '2026-01-15')).toBe(-31);
  });

  it('handles Date objects', () => {
    const due = new Date('2026-01-01');
    const asOf = new Date('2026-01-11');
    expect(computeDaysOverdue(due, asOf)).toBe(10);
  });

  it('calculates correctly across month boundaries', () => {
    // January 31 to March 1 in non-leap year (2026) = 29 days
    expect(computeDaysOverdue('2026-01-31', '2026-03-01')).toBe(29);
  });

  it('calculates correctly across year boundaries', () => {
    expect(computeDaysOverdue('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('handles exactly 90 days', () => {
    // 2026-01-01 to 2026-04-01 = 90 days
    expect(computeDaysOverdue('2026-01-01', '2026-04-01')).toBe(90);
  });
});

// ============================================================================
// computeProfitLossTotals
// ============================================================================

describe('computeProfitLossTotals', () => {
  it('computes totals from revenue and expense amounts', () => {
    const result = computeProfitLossTotals(
      ['1000.00', '2000.00', '500.00'],
      ['800.00', '300.00']
    );

    expect(result.totalRevenue).toBe(3500);
    expect(result.totalExpenses).toBe(1100);
    expect(result.netIncome).toBe(2400);
  });

  it('handles empty arrays (no revenue, no expenses)', () => {
    const result = computeProfitLossTotals([], []);

    expect(result.totalRevenue).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.netIncome).toBe(0);
  });

  it('handles net loss (expenses exceed revenue)', () => {
    const result = computeProfitLossTotals(
      ['1000.00'],
      ['1500.00']
    );

    expect(result.totalRevenue).toBe(1000);
    expect(result.totalExpenses).toBe(1500);
    expect(result.netIncome).toBe(-500);
  });

  it('handles precise decimal amounts', () => {
    const result = computeProfitLossTotals(
      ['100.33', '200.67'],
      ['150.50']
    );

    expect(result.totalRevenue).toBe(301);
    expect(result.totalExpenses).toBe(150.5);
    expect(result.netIncome).toBe(150.5);
  });

  it('handles null/empty string amounts gracefully', () => {
    const result = computeProfitLossTotals(
      ['1000.00', '', '500.00'],
      ['0']
    );

    expect(result.totalRevenue).toBe(1500);
    expect(result.totalExpenses).toBe(0);
    expect(result.netIncome).toBe(1500);
  });
});

// ============================================================================
// computeRetainedEarnings
// ============================================================================

describe('computeRetainedEarnings', () => {
  it('basic calculation: assets - liabilities - equity', () => {
    expect(computeRetainedEarnings(100000, 40000, 50000)).toBe(10000);
  });

  it('returns zero when balanced', () => {
    expect(computeRetainedEarnings(100000, 60000, 40000)).toBe(0);
  });

  it('returns negative when equity exceeds net assets', () => {
    expect(computeRetainedEarnings(100000, 60000, 50000)).toBe(-10000);
  });

  it('handles zero values', () => {
    expect(computeRetainedEarnings(0, 0, 0)).toBe(0);
  });

  it('handles decimal amounts without floating-point errors', () => {
    // 100000.50 - 60000.25 - 39999.75 = 0.50
    expect(computeRetainedEarnings(100000.50, 60000.25, 39999.75)).toBe(0.5);
  });
});

// ============================================================================
// mergeSalesRows
// ============================================================================

describe('mergeSalesRows', () => {
  it('merges invoice and credit rows for same month', () => {
    const invoiceRows = [
      { month: '2026-01', count: 5, revenue: '10000.00', vatAmount: '810.00' },
    ];
    const creditRows = [
      { month: '2026-01', count: 1, amount: '500.00' },
    ];

    const result = mergeSalesRows(invoiceRows, creditRows);

    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2026-01');
    expect(result[0].invoiceCount).toBe(5);
    expect(result[0].revenue).toBe(10000);
    expect(result[0].vatAmount).toBe(810);
    expect(result[0].creditNoteCount).toBe(1);
    expect(result[0].creditNoteAmount).toBe(500);
    expect(result[0].netRevenue).toBe(9500);
  });

  it('handles months with only invoices', () => {
    const invoiceRows = [
      { month: '2026-01', count: 3, revenue: '5000.00', vatAmount: '405.00' },
    ];
    const creditRows: Array<{ month: string; count: number; amount: string }> = [];

    const result = mergeSalesRows(invoiceRows, creditRows);

    expect(result).toHaveLength(1);
    expect(result[0].creditNoteCount).toBe(0);
    expect(result[0].creditNoteAmount).toBe(0);
    expect(result[0].netRevenue).toBe(5000);
  });

  it('handles months with only credit notes', () => {
    const invoiceRows: Array<{ month: string; count: number; revenue: string; vatAmount: string }> = [];
    const creditRows = [
      { month: '2026-02', count: 2, amount: '300.00' },
    ];

    const result = mergeSalesRows(invoiceRows, creditRows);

    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2026-02');
    expect(result[0].invoiceCount).toBe(0);
    expect(result[0].revenue).toBe(0);
    expect(result[0].creditNoteCount).toBe(2);
    expect(result[0].creditNoteAmount).toBe(300);
    expect(result[0].netRevenue).toBe(-300);
  });

  it('sorts months chronologically', () => {
    const invoiceRows = [
      { month: '2026-03', count: 1, revenue: '100.00', vatAmount: '8.10' },
      { month: '2026-01', count: 1, revenue: '200.00', vatAmount: '16.20' },
    ];
    const creditRows = [
      { month: '2026-02', count: 1, amount: '50.00' },
    ];

    const result = mergeSalesRows(invoiceRows, creditRows);

    expect(result.map((r) => r.month)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('handles multiple months correctly', () => {
    const invoiceRows = [
      { month: '2026-01', count: 10, revenue: '50000.00', vatAmount: '4050.00' },
      { month: '2026-02', count: 8, revenue: '40000.00', vatAmount: '3240.00' },
      { month: '2026-03', count: 12, revenue: '60000.00', vatAmount: '4860.00' },
    ];
    const creditRows = [
      { month: '2026-01', count: 2, amount: '1000.00' },
      { month: '2026-03', count: 1, amount: '500.00' },
    ];

    const result = mergeSalesRows(invoiceRows, creditRows);

    expect(result).toHaveLength(3);
    expect(result[0].netRevenue).toBe(49000);  // 50000 - 1000
    expect(result[1].netRevenue).toBe(40000);  // 40000 - 0
    expect(result[2].netRevenue).toBe(59500);  // 60000 - 500
  });

  it('handles empty inputs', () => {
    const result = mergeSalesRows([], []);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// computeSalesTotals
// ============================================================================

describe('computeSalesTotals', () => {
  it('sums all fields across rows', () => {
    const rows = [
      { month: '2026-01', invoiceCount: 5, revenue: 10000, vatAmount: 810, creditNoteCount: 1, creditNoteAmount: 500, netRevenue: 9500 },
      { month: '2026-02', invoiceCount: 3, revenue: 8000, vatAmount: 648, creditNoteCount: 0, creditNoteAmount: 0, netRevenue: 8000 },
    ];

    const totals = computeSalesTotals(rows);

    expect(totals.invoiceCount).toBe(8);
    expect(totals.revenue).toBe(18000);
    expect(totals.vatAmount).toBe(1458);
    expect(totals.creditNoteCount).toBe(1);
    expect(totals.creditNoteAmount).toBe(500);
    expect(totals.netRevenue).toBe(17500);
  });

  it('returns zeros for empty array', () => {
    const totals = computeSalesTotals([]);

    expect(totals.invoiceCount).toBe(0);
    expect(totals.revenue).toBe(0);
    expect(totals.vatAmount).toBe(0);
    expect(totals.creditNoteCount).toBe(0);
    expect(totals.creditNoteAmount).toBe(0);
    expect(totals.netRevenue).toBe(0);
  });

  it('handles single row', () => {
    const rows = [
      { month: '2026-06', invoiceCount: 1, revenue: 1234.56, vatAmount: 99.99, creditNoteCount: 0, creditNoteAmount: 0, netRevenue: 1234.56 },
    ];

    const totals = computeSalesTotals(rows);

    expect(totals.invoiceCount).toBe(1);
    expect(totals.revenue).toBe(1234.56);
    expect(totals.vatAmount).toBe(99.99);
    expect(totals.netRevenue).toBe(1234.56);
  });

  it('handles decimal precision across many rows', () => {
    const rows = [
      { month: '2026-01', invoiceCount: 1, revenue: 0.10, vatAmount: 0.01, creditNoteCount: 0, creditNoteAmount: 0, netRevenue: 0.10 },
      { month: '2026-02', invoiceCount: 1, revenue: 0.20, vatAmount: 0.02, creditNoteCount: 0, creditNoteAmount: 0, netRevenue: 0.20 },
      { month: '2026-03', invoiceCount: 1, revenue: 0.30, vatAmount: 0.02, creditNoteCount: 0, creditNoteAmount: 0, netRevenue: 0.30 },
    ];

    const totals = computeSalesTotals(rows);

    // 0.1 + 0.2 + 0.3 = 0.6 exactly (Decimal.js avoids IEEE 754 issues)
    expect(totals.revenue).toBe(0.6);
    expect(totals.netRevenue).toBe(0.6);
  });
});
