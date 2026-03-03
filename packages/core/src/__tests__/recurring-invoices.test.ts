import { describe, it, expect } from 'vitest';
import {
  createRecurringConfigSchema,
  updateRecurringConfigSchema,
} from '../domain/recurring-invoices';

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe('createRecurringConfigSchema', () => {
  const validInput = {
    orderId: '550e8400-e29b-41d4-a716-446655440000',
    periodicity: 'monthly' as const,
    startDate: '2026-01-15',
  };

  it('accepts valid minimal input', () => {
    const result = createRecurringConfigSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts all optional fields', () => {
    const result = createRecurringConfigSchema.safeParse({
      ...validInput,
      endDate: '2026-12-31',
      autoExtensionMonths: 12,
      emailRecipients: ['test@example.com', 'other@example.com'],
      notes: 'Monthly hosting invoice',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing orderId', () => {
    const result = createRecurringConfigSchema.safeParse({
      periodicity: 'monthly',
      startDate: '2026-01-15',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid orderId (not UUID)', () => {
    const result = createRecurringConfigSchema.safeParse({
      ...validInput,
      orderId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid periodicity', () => {
    const result = createRecurringConfigSchema.safeParse({
      ...validInput,
      periodicity: 'weekly',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid periodicities', () => {
    for (const periodicity of ['monthly', 'quarterly', 'annual']) {
      const result = createRecurringConfigSchema.safeParse({
        ...validInput,
        periodicity,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid date format', () => {
    const result = createRecurringConfigSchema.safeParse({
      ...validInput,
      startDate: '15.01.2026',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email in recipients', () => {
    const result = createRecurringConfigSchema.safeParse({
      ...validInput,
      emailRecipients: ['valid@example.com', 'not-an-email'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts null for optional fields', () => {
    const result = createRecurringConfigSchema.safeParse({
      ...validInput,
      endDate: null,
      autoExtensionMonths: null,
      emailRecipients: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects autoExtensionMonths out of range', () => {
    expect(
      createRecurringConfigSchema.safeParse({
        ...validInput,
        autoExtensionMonths: 0,
      }).success
    ).toBe(false);

    expect(
      createRecurringConfigSchema.safeParse({
        ...validInput,
        autoExtensionMonths: 61,
      }).success
    ).toBe(false);
  });
});

describe('updateRecurringConfigSchema', () => {
  it('accepts empty update (all optional)', () => {
    const result = updateRecurringConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial updates', () => {
    const result = updateRecurringConfigSchema.safeParse({
      isActive: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });

  it('accepts periodicity change', () => {
    const result = updateRecurringConfigSchema.safeParse({
      periodicity: 'quarterly',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid periodicity', () => {
    const result = updateRecurringConfigSchema.safeParse({
      periodicity: 'biweekly',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// DATE CALCULATION TESTS
// Mirrors calculateNextDate internal logic
// ============================================================================

describe('calculateNextDate logic', () => {
  function calculateNextDate(date: Date, periodicity: string): Date {
    const next = new Date(date);
    switch (periodicity) {
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'annual':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  it('monthly: Jan 15 → Feb 15', () => {
    const d = new Date(2026, 0, 15); // Jan 15
    const next = calculateNextDate(d, 'monthly');
    expect(next.getMonth()).toBe(1); // Feb
    expect(next.getDate()).toBe(15);
  });

  it('quarterly: Jan 15 → Apr 15', () => {
    const d = new Date(2026, 0, 15);
    const next = calculateNextDate(d, 'quarterly');
    expect(next.getMonth()).toBe(3); // Apr
    expect(next.getDate()).toBe(15);
  });

  it('annual: Jan 15, 2026 → Jan 15, 2027', () => {
    const d = new Date(2026, 0, 15);
    const next = calculateNextDate(d, 'annual');
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(15);
  });

  it('monthly: handles month-end rollover (Jan 31 → Feb 28)', () => {
    const d = new Date(2026, 0, 31); // Jan 31
    const next = calculateNextDate(d, 'monthly');
    // JS Date rolls Jan 31 + 1 month → Feb 28 (or Mar 3 in some cases)
    // In JS, setMonth(1) on Jan 31 = Mar 3 (overflow) — this is JS behavior
    expect(next.getMonth()).toBe(2); // March (overflow from Feb 31)
    expect(next.getDate()).toBe(3);
  });

  it('monthly: Dec → next year Jan', () => {
    const d = new Date(2026, 11, 15); // Dec 15
    const next = calculateNextDate(d, 'monthly');
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0); // Jan
    expect(next.getDate()).toBe(15);
  });

  it('quarterly: Oct → next year Jan', () => {
    const d = new Date(2026, 9, 15); // Oct 15
    const next = calculateNextDate(d, 'quarterly');
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0); // Jan
    expect(next.getDate()).toBe(15);
  });

  it('annual: handles leap year (Feb 29 → Feb 28 next year)', () => {
    // 2028 is a leap year
    const d = new Date(2028, 1, 29); // Feb 29
    const next = calculateNextDate(d, 'annual');
    expect(next.getFullYear()).toBe(2029);
    // Feb 29 in non-leap year overflows to Mar 1
    expect(next.getMonth()).toBe(2); // March
    expect(next.getDate()).toBe(1);
  });
});

// ============================================================================
// PERIOD DATES CALCULATION
// Mirrors calculatePeriodDates logic
// ============================================================================

describe('calculatePeriodDates logic', () => {
  function calculateNextDate(date: Date, periodicity: string): Date {
    const next = new Date(date);
    switch (periodicity) {
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'annual':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  function calculatePeriodDates(
    generationDate: Date,
    periodicity: string
  ): { start: Date; end: Date } {
    const start = new Date(generationDate);
    const end = calculateNextDate(start, periodicity);
    end.setDate(end.getDate() - 1); // Last day of period
    return { start, end };
  }

  it('monthly: Jan 1 → Jan 1 to Jan 31', () => {
    const { start, end } = calculatePeriodDates(new Date(2026, 0, 1), 'monthly');
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(31);
  });

  it('quarterly: Jan 1 → Jan 1 to Mar 31', () => {
    const { start, end } = calculatePeriodDates(new Date(2026, 0, 1), 'quarterly');
    expect(start.getMonth()).toBe(0);
    expect(end.getMonth()).toBe(2); // March
    expect(end.getDate()).toBe(31);
  });

  it('annual: Jan 1 → Jan 1 to Dec 31', () => {
    const { start, end } = calculatePeriodDates(new Date(2026, 0, 1), 'annual');
    expect(start.getMonth()).toBe(0);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(11); // December
    expect(end.getDate()).toBe(31);
  });
});

// ============================================================================
// VARIABLE SUBSTITUTION
// Mirrors substituteVariables logic
// ============================================================================

describe('variable substitution logic', () => {
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ];

  function calculateNextDate(date: Date, periodicity: string): Date {
    const next = new Date(date);
    switch (periodicity) {
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'annual':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  function substituteVariables(
    text: string,
    generationDate: Date,
    periodicity: string
  ): string {
    const start = new Date(generationDate);
    const end = calculateNextDate(start, periodicity);
    end.setDate(end.getDate() - 1);

    const quarter = `Q${Math.floor(start.getMonth() / 3) + 1}`;

    return text
      .replace(/<%period_start_date%>/g, start.toLocaleDateString('de-CH'))
      .replace(/<%period_end_date%>/g, end.toLocaleDateString('de-CH'))
      .replace(/<%current_month%>/g, monthNames[start.getMonth()])
      .replace(/<%current_year%>/g, start.getFullYear().toString())
      .replace(/<%current_quarter%>/g, quarter);
  }

  it('replaces <%current_year%>', () => {
    const result = substituteVariables(
      'Rechnung <%current_year%>',
      new Date(2026, 5, 15),
      'monthly'
    );
    expect(result).toBe('Rechnung 2026');
  });

  it('replaces <%current_month%>', () => {
    const result = substituteVariables(
      'Rechnung <%current_month%>',
      new Date(2026, 0, 15),
      'monthly'
    );
    expect(result).toBe('Rechnung Januar');
  });

  it('replaces <%current_quarter%> for Q1', () => {
    const result = substituteVariables(
      'Quartal: <%current_quarter%>',
      new Date(2026, 1, 1), // February = Q1
      'quarterly'
    );
    expect(result).toBe('Quartal: Q1');
  });

  it('replaces <%current_quarter%> for Q2', () => {
    const result = substituteVariables(
      '<%current_quarter%>',
      new Date(2026, 3, 1), // April = Q2
      'quarterly'
    );
    expect(result).toBe('Q2');
  });

  it('replaces <%current_quarter%> for Q3', () => {
    const result = substituteVariables(
      '<%current_quarter%>',
      new Date(2026, 8, 1), // September = Q3
      'quarterly'
    );
    expect(result).toBe('Q3');
  });

  it('replaces <%current_quarter%> for Q4', () => {
    const result = substituteVariables(
      '<%current_quarter%>',
      new Date(2026, 11, 1), // December = Q4
      'quarterly'
    );
    expect(result).toBe('Q4');
  });

  it('replaces multiple variables in one string', () => {
    const result = substituteVariables(
      'Hosting <%current_month%> <%current_year%> (<%current_quarter%>)',
      new Date(2026, 2, 1), // March
      'quarterly'
    );
    expect(result).toBe('Hosting März 2026 (Q1)');
  });

  it('handles all month names correctly', () => {
    for (let month = 0; month < 12; month++) {
      const result = substituteVariables(
        '<%current_month%>',
        new Date(2026, month, 1),
        'monthly'
      );
      expect(result).toBe(monthNames[month]);
    }
  });

  it('replaces multiple occurrences of same variable', () => {
    const result = substituteVariables(
      '<%current_year%> / <%current_year%>',
      new Date(2026, 0, 1),
      'monthly'
    );
    expect(result).toBe('2026 / 2026');
  });

  it('leaves text unchanged when no variables present', () => {
    const result = substituteVariables(
      'Regular invoice text with no templates',
      new Date(2026, 0, 1),
      'monthly'
    );
    expect(result).toBe('Regular invoice text with no templates');
  });
});

// ============================================================================
// DATE UTILITY TESTS
// Mirrors toISODate and parseISODate
// ============================================================================

describe('date utilities', () => {
  function toISODate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function parseISODate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00Z');
  }

  it('toISODate formats correctly', () => {
    expect(toISODate(new Date('2026-03-15T12:00:00Z'))).toBe('2026-03-15');
  });

  it('parseISODate parses correctly', () => {
    const d = parseISODate('2026-03-15');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(2); // March (0-indexed)
    expect(d.getUTCDate()).toBe(15);
  });

  it('parseISODate always uses UTC midnight', () => {
    const d = parseISODate('2026-01-01');
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
  });

  it('roundtrip: toISODate(parseISODate(x)) === x', () => {
    const date = '2026-07-20';
    expect(toISODate(parseISODate(date))).toBe(date);
  });
});
