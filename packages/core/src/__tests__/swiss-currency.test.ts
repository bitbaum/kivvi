import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { rappenRound, formatSwissFrancs } from '../utils/swiss-currency';

describe('rappenRound', () => {
  it('rounds .00 → .00 (exact)', () => {
    expect(rappenRound(new Decimal('10.00')).toFixed(2)).toBe('10.00');
  });

  it('rounds .01 → .00', () => {
    expect(rappenRound(new Decimal('10.01')).toFixed(2)).toBe('10.00');
  });

  it('rounds .02 → .00', () => {
    expect(rappenRound(new Decimal('10.02')).toFixed(2)).toBe('10.00');
  });

  it('rounds .03 → .05 (rounds up at midpoint)', () => {
    // 10.03 * 20 = 200.6 → rounds to 201 → 201/20 = 10.05
    expect(rappenRound(new Decimal('10.03')).toFixed(2)).toBe('10.05');
  });

  it('rounds .04 → .05', () => {
    expect(rappenRound(new Decimal('10.04')).toFixed(2)).toBe('10.05');
  });

  it('rounds .05 → .05 (exact)', () => {
    expect(rappenRound(new Decimal('10.05')).toFixed(2)).toBe('10.05');
  });

  it('rounds .06 → .05', () => {
    expect(rappenRound(new Decimal('10.06')).toFixed(2)).toBe('10.05');
  });

  it('rounds .07 → .05', () => {
    expect(rappenRound(new Decimal('10.07')).toFixed(2)).toBe('10.05');
  });

  it('rounds .08 → .10 (rounds up at midpoint)', () => {
    // 10.08 * 20 = 201.6 → rounds to 202 → 202/20 = 10.10
    expect(rappenRound(new Decimal('10.08')).toFixed(2)).toBe('10.10');
  });

  it('rounds .09 → .10', () => {
    expect(rappenRound(new Decimal('10.09')).toFixed(2)).toBe('10.10');
  });

  it('rounds .10 → .10 (exact)', () => {
    expect(rappenRound(new Decimal('10.10')).toFixed(2)).toBe('10.10');
  });

  it('rounds .12 → .10', () => {
    expect(rappenRound(new Decimal('10.12')).toFixed(2)).toBe('10.10');
  });

  it('rounds .13 → .15', () => {
    expect(rappenRound(new Decimal('10.13')).toFixed(2)).toBe('10.15');
  });

  it('rounds .17 → .15', () => {
    expect(rappenRound(new Decimal('10.17')).toFixed(2)).toBe('10.15');
  });

  it('rounds .18 → .20', () => {
    expect(rappenRound(new Decimal('10.18')).toFixed(2)).toBe('10.20');
  });

  it('rounds .95 → .95 (exact)', () => {
    expect(rappenRound(new Decimal('10.95')).toFixed(2)).toBe('10.95');
  });

  it('rounds .97 → .95', () => {
    expect(rappenRound(new Decimal('10.97')).toFixed(2)).toBe('10.95');
  });

  it('rounds .98 → 1.00', () => {
    expect(rappenRound(new Decimal('10.98')).toFixed(2)).toBe('11.00');
  });

  it('handles zero', () => {
    expect(rappenRound(new Decimal('0')).toFixed(2)).toBe('0.00');
  });

  it('handles negative amounts', () => {
    expect(rappenRound(new Decimal('-10.12')).toFixed(2)).toBe('-10.10');
    expect(rappenRound(new Decimal('-10.13')).toFixed(2)).toBe('-10.15');
  });

  it('handles large amounts', () => {
    expect(rappenRound(new Decimal('999999.99')).toFixed(2)).toBe('1000000.00');
    expect(rappenRound(new Decimal('999999.97')).toFixed(2)).toBe('999999.95');
  });
});

describe('formatSwissFrancs', () => {
  it('formats a simple amount', () => {
    const result = formatSwissFrancs(new Decimal('100'));
    expect(result).toContain('100');
    expect(result).toContain('CHF');
  });

  it('formats with rappen rounding applied', () => {
    const result = formatSwissFrancs(new Decimal('10.12'));
    // Should display 10.10 after rappen rounding
    expect(result).toContain('10.10');
  });

  it('accepts string input', () => {
    const result = formatSwissFrancs('1234.50');
    expect(result).toContain('CHF');
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  it('formats zero correctly', () => {
    const result = formatSwissFrancs('0');
    expect(result).toContain('0.00');
  });
});
