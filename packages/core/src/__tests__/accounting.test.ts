import { describe, it, expect } from 'vitest';
import {
  createAccountSchema,
  updateAccountSchema,
  journalLineSchema,
  createJournalEntrySchema,
  createFiscalYearSchema,
  validateJournalBalance,
  generateFiscalPeriods,
} from '../domain/accounting';

// ============================================================================
// validateJournalBalance
// ============================================================================

describe('validateJournalBalance', () => {
  it('balanced entry: single debit and credit', () => {
    const result = validateJournalBalance([
      { debit: '100.00', credit: null },
      { debit: null, credit: '100.00' },
    ]);

    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe('100.00');
    expect(result.totalCredits).toBe('100.00');
  });

  it('balanced entry: multiple lines', () => {
    const result = validateJournalBalance([
      { debit: '500.00', credit: null },
      { debit: '250.00', credit: null },
      { debit: null, credit: '300.00' },
      { debit: null, credit: '450.00' },
    ]);

    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe('750.00');
    expect(result.totalCredits).toBe('750.00');
  });

  it('unbalanced entry: debits exceed credits', () => {
    const result = validateJournalBalance([
      { debit: '100.00', credit: null },
      { debit: null, credit: '50.00' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.totalDebits).toBe('100.00');
    expect(result.totalCredits).toBe('50.00');
  });

  it('unbalanced entry: credits exceed debits', () => {
    const result = validateJournalBalance([
      { debit: '30.00', credit: null },
      { debit: null, credit: '100.00' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.totalDebits).toBe('30.00');
    expect(result.totalCredits).toBe('100.00');
  });

  it('tolerance: difference of exactly 0.005 is valid', () => {
    const result = validateJournalBalance([
      { debit: '100.005', credit: null },
      { debit: null, credit: '100.00' },
    ]);

    expect(result.valid).toBe(true);
  });

  it('tolerance: difference of 0.006 is invalid', () => {
    const result = validateJournalBalance([
      { debit: '100.006', credit: null },
      { debit: null, credit: '100.00' },
    ]);

    expect(result.valid).toBe(false);
  });

  it('handles null/undefined debit and credit as zero', () => {
    const result = validateJournalBalance([
      { debit: '100.00', credit: null },
      { debit: undefined, credit: '100.00' },
    ]);

    expect(result.valid).toBe(true);
  });

  it('handles empty string debit/credit as zero', () => {
    const result = validateJournalBalance([
      { debit: '50.00', credit: '' },
      { debit: '', credit: '50.00' },
    ]);

    expect(result.valid).toBe(true);
  });

  it('handles large amounts without floating-point errors', () => {
    const result = validateJournalBalance([
      { debit: '999999.99', credit: null },
      { debit: null, credit: '999999.99' },
    ]);

    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe('999999.99');
    expect(result.totalCredits).toBe('999999.99');
  });

  it('all zeros is balanced', () => {
    const result = validateJournalBalance([
      { debit: '0', credit: null },
      { debit: null, credit: '0' },
    ]);

    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe('0.00');
    expect(result.totalCredits).toBe('0.00');
  });

  it('mixed debit and credit on same line', () => {
    // A line could theoretically have both, debits and credits sum independently
    const result = validateJournalBalance([
      { debit: '100.00', credit: '50.00' },
      { debit: null, credit: '50.00' },
    ]);

    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe('100.00');
    expect(result.totalCredits).toBe('100.00');
  });

  it('Swiss franc amounts with centimes precision', () => {
    // Typical Swiss invoice: net + VAT entry
    const result = validateJournalBalance([
      { debit: '1080.00', credit: null },    // Debtor
      { debit: null, credit: '1000.00' },    // Revenue
      { debit: null, credit: '80.00' },      // VAT payable (8%)
    ]);

    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// generateFiscalPeriods
// ============================================================================

describe('generateFiscalPeriods', () => {
  it('generates 12 periods for a calendar year', () => {
    const periods = generateFiscalPeriods('2026-01-01');

    expect(periods).toHaveLength(12);
    expect(periods[0].name).toBe('Januar 2026');
    expect(periods[0].startDate).toBe('2026-01-01');
    expect(periods[0].endDate).toBe('2026-01-31');
    expect(periods[11].name).toBe('Dezember 2026');
    expect(periods[11].startDate).toBe('2026-12-01');
    expect(periods[11].endDate).toBe('2026-12-31');
  });

  it('generates correct German month names', () => {
    const periods = generateFiscalPeriods('2026-01-01');
    const expectedNames = [
      'Januar 2026', 'Februar 2026', 'März 2026', 'April 2026',
      'Mai 2026', 'Juni 2026', 'Juli 2026', 'August 2026',
      'September 2026', 'Oktober 2026', 'November 2026', 'Dezember 2026',
    ];

    expect(periods.map((p) => p.name)).toEqual(expectedNames);
  });

  it('handles leap year February', () => {
    const periods = generateFiscalPeriods('2024-01-01');

    // 2024 is a leap year
    expect(periods[1].name).toBe('Februar 2024');
    expect(periods[1].startDate).toBe('2024-02-01');
    expect(periods[1].endDate).toBe('2024-02-29');
  });

  it('handles non-leap year February', () => {
    const periods = generateFiscalPeriods('2025-01-01');

    expect(periods[1].name).toBe('Februar 2025');
    expect(periods[1].endDate).toBe('2025-02-28');
  });

  it('handles fiscal year starting mid-year (July)', () => {
    const periods = generateFiscalPeriods('2026-07-01');

    expect(periods).toHaveLength(12);
    expect(periods[0].name).toBe('Juli 2026');
    expect(periods[0].startDate).toBe('2026-07-01');
    expect(periods[0].endDate).toBe('2026-07-31');
    expect(periods[5].name).toBe('Dezember 2026');
    expect(periods[6].name).toBe('Januar 2027');
    expect(periods[11].name).toBe('Juni 2027');
    expect(periods[11].startDate).toBe('2027-06-01');
    expect(periods[11].endDate).toBe('2027-06-30');
  });

  it('handles fiscal year starting in April (Swiss tax common)', () => {
    const periods = generateFiscalPeriods('2026-04-01');

    expect(periods[0].name).toBe('April 2026');
    expect(periods[8].name).toBe('Dezember 2026');
    expect(periods[9].name).toBe('Januar 2027');
    expect(periods[11].name).toBe('März 2027');
  });

  it('each period end date is last day of that month', () => {
    const periods = generateFiscalPeriods('2026-01-01');
    const expectedEndDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    periods.forEach((p, i) => {
      const endDay = parseInt(p.endDate.split('-')[2], 10);
      expect(endDay).toBe(expectedEndDays[i]);
    });
  });

  it('periods are contiguous (no gaps)', () => {
    const periods = generateFiscalPeriods('2026-01-01');

    for (let i = 1; i < periods.length; i++) {
      const prevEnd = new Date(periods[i - 1].endDate);
      const currStart = new Date(periods[i].startDate);
      // Next period starts exactly 1 day after previous period ends
      const diff = (currStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(1);
    }
  });
});

// ============================================================================
// Zod Validation Schemas
// ============================================================================

describe('createAccountSchema', () => {
  it('accepts valid account data', () => {
    const result = createAccountSchema.safeParse({
      code: '1000',
      name: 'Kasse',
      type: 'asset',
    });

    expect(result.success).toBe(true);
  });

  it('accepts all valid account types', () => {
    const types = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
    for (const type of types) {
      const result = createAccountSchema.safeParse({
        code: '1000',
        name: 'Test',
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid account type', () => {
    const result = createAccountSchema.safeParse({
      code: '1000',
      name: 'Test',
      type: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty code', () => {
    const result = createAccountSchema.safeParse({
      code: '',
      name: 'Test',
      type: 'asset',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createAccountSchema.safeParse({
      code: '1000',
      name: '',
      type: 'asset',
    });

    expect(result.success).toBe(false);
  });

  it('rejects code longer than 10 characters', () => {
    const result = createAccountSchema.safeParse({
      code: '12345678901',
      name: 'Test',
      type: 'asset',
    });

    expect(result.success).toBe(false);
  });

  it('rejects name longer than 200 characters', () => {
    const result = createAccountSchema.safeParse({
      code: '1000',
      name: 'A'.repeat(201),
      type: 'asset',
    });

    expect(result.success).toBe(false);
  });

  it('accepts optional parentId as UUID', () => {
    const result = createAccountSchema.safeParse({
      code: '1000',
      name: 'Test',
      type: 'asset',
      parentId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for parentId', () => {
    const result = createAccountSchema.safeParse({
      code: '1000',
      name: 'Test',
      type: 'asset',
      parentId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });

  it('accepts null parentId', () => {
    const result = createAccountSchema.safeParse({
      code: '1000',
      name: 'Test',
      type: 'asset',
      parentId: null,
    });

    expect(result.success).toBe(true);
  });
});

describe('updateAccountSchema', () => {
  it('accepts partial updates (all fields optional)', () => {
    const result = updateAccountSchema.safeParse({
      name: 'Updated Name',
    });

    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateAccountSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('createJournalEntrySchema', () => {
  it('accepts valid journal entry with 2 lines', () => {
    const result = createJournalEntrySchema.safeParse({
      date: '2026-01-15',
      description: 'Test entry',
      lines: [
        { accountId: '550e8400-e29b-41d4-a716-446655440000', debit: '100.00' },
        { accountId: '550e8400-e29b-41d4-a716-446655440001', credit: '100.00' },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects fewer than 2 lines', () => {
    const result = createJournalEntrySchema.safeParse({
      date: '2026-01-15',
      description: 'Test entry',
      lines: [
        { accountId: '550e8400-e29b-41d4-a716-446655440000', debit: '100.00' },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing date', () => {
    const result = createJournalEntrySchema.safeParse({
      date: '',
      description: 'Test entry',
      lines: [
        { accountId: '550e8400-e29b-41d4-a716-446655440000', debit: '100.00' },
        { accountId: '550e8400-e29b-41d4-a716-446655440001', credit: '100.00' },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing description', () => {
    const result = createJournalEntrySchema.safeParse({
      date: '2026-01-15',
      description: '',
      lines: [
        { accountId: '550e8400-e29b-41d4-a716-446655440000', debit: '100.00' },
        { accountId: '550e8400-e29b-41d4-a716-446655440001', credit: '100.00' },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('accepts optional reference', () => {
    const result = createJournalEntrySchema.safeParse({
      date: '2026-01-15',
      reference: 'REF-001',
      description: 'Test entry',
      lines: [
        { accountId: '550e8400-e29b-41d4-a716-446655440000', debit: '100.00' },
        { accountId: '550e8400-e29b-41d4-a716-446655440001', credit: '100.00' },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reference).toBe('REF-001');
    }
  });
});

describe('createFiscalYearSchema', () => {
  it('accepts valid fiscal year', () => {
    const result = createFiscalYearSchema.safeParse({
      name: 'Geschäftsjahr 2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createFiscalYearSchema.safeParse({
      name: '',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty startDate', () => {
    const result = createFiscalYearSchema.safeParse({
      name: 'FY 2026',
      startDate: '',
      endDate: '2026-12-31',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty endDate', () => {
    const result = createFiscalYearSchema.safeParse({
      name: 'FY 2026',
      startDate: '2026-01-01',
      endDate: '',
    });

    expect(result.success).toBe(false);
  });
});
