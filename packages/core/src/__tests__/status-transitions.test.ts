import { describe, it, expect } from 'vitest';
import { isValidTransition } from '../domain/documents';

describe('isValidTransition', () => {
  // ── From draft ──
  it('draft → sent', () => {
    expect(isValidTransition('draft', 'sent')).toBe(true);
  });

  it('draft → cancelled', () => {
    expect(isValidTransition('draft', 'cancelled')).toBe(true);
  });

  it('draft → paid (invalid)', () => {
    expect(isValidTransition('draft', 'paid')).toBe(false);
  });

  it('draft → confirmed (invalid)', () => {
    expect(isValidTransition('draft', 'confirmed')).toBe(false);
  });

  // ── From sent ──
  it('sent → confirmed', () => {
    expect(isValidTransition('sent', 'confirmed')).toBe(true);
  });

  it('sent → paid', () => {
    expect(isValidTransition('sent', 'paid')).toBe(true);
  });

  it('sent → partially_paid', () => {
    expect(isValidTransition('sent', 'partially_paid')).toBe(true);
  });

  it('sent → overdue', () => {
    expect(isValidTransition('sent', 'overdue')).toBe(true);
  });

  it('sent → cancelled', () => {
    expect(isValidTransition('sent', 'cancelled')).toBe(true);
  });

  it('sent → draft (invalid)', () => {
    expect(isValidTransition('sent', 'draft')).toBe(false);
  });

  // ── From confirmed ──
  it('confirmed → delivered', () => {
    expect(isValidTransition('confirmed', 'delivered')).toBe(true);
  });

  it('confirmed → paid', () => {
    expect(isValidTransition('confirmed', 'paid')).toBe(true);
  });

  it('confirmed → partially_paid', () => {
    expect(isValidTransition('confirmed', 'partially_paid')).toBe(true);
  });

  it('confirmed → overdue', () => {
    expect(isValidTransition('confirmed', 'overdue')).toBe(true);
  });

  it('confirmed → cancelled', () => {
    expect(isValidTransition('confirmed', 'cancelled')).toBe(true);
  });

  // ── From delivered ──
  it('delivered → paid', () => {
    expect(isValidTransition('delivered', 'paid')).toBe(true);
  });

  it('delivered → partially_paid', () => {
    expect(isValidTransition('delivered', 'partially_paid')).toBe(true);
  });

  it('delivered → overdue', () => {
    expect(isValidTransition('delivered', 'overdue')).toBe(true);
  });

  it('delivered → cancelled', () => {
    expect(isValidTransition('delivered', 'cancelled')).toBe(true);
  });

  // ── From partially_paid ──
  it('partially_paid → paid', () => {
    expect(isValidTransition('partially_paid', 'paid')).toBe(true);
  });

  it('partially_paid → overdue', () => {
    expect(isValidTransition('partially_paid', 'overdue')).toBe(true);
  });

  it('partially_paid → cancelled', () => {
    expect(isValidTransition('partially_paid', 'cancelled')).toBe(true);
  });

  // ── From overdue ── (dunning escalation path)
  it('overdue → paid', () => {
    expect(isValidTransition('overdue', 'paid')).toBe(true);
  });

  it('overdue → partially_paid', () => {
    expect(isValidTransition('overdue', 'partially_paid')).toBe(true);
  });

  it('overdue → dunning_1', () => {
    expect(isValidTransition('overdue', 'dunning_1')).toBe(true);
  });

  it('overdue → cancelled', () => {
    expect(isValidTransition('overdue', 'cancelled')).toBe(true);
  });

  it('overdue → dunning_2 (invalid, must go through dunning_1)', () => {
    expect(isValidTransition('overdue', 'dunning_2')).toBe(false);
  });

  // ── From dunning_1 ──
  it('dunning_1 → paid', () => {
    expect(isValidTransition('dunning_1', 'paid')).toBe(true);
  });

  it('dunning_1 → partially_paid', () => {
    expect(isValidTransition('dunning_1', 'partially_paid')).toBe(true);
  });

  it('dunning_1 → dunning_2', () => {
    expect(isValidTransition('dunning_1', 'dunning_2')).toBe(true);
  });

  it('dunning_1 → cancelled', () => {
    expect(isValidTransition('dunning_1', 'cancelled')).toBe(true);
  });

  // ── From dunning_2 ──
  it('dunning_2 → paid', () => {
    expect(isValidTransition('dunning_2', 'paid')).toBe(true);
  });

  it('dunning_2 → partially_paid', () => {
    expect(isValidTransition('dunning_2', 'partially_paid')).toBe(true);
  });

  it('dunning_2 → dunning_3', () => {
    expect(isValidTransition('dunning_2', 'dunning_3')).toBe(true);
  });

  it('dunning_2 → cancelled', () => {
    expect(isValidTransition('dunning_2', 'cancelled')).toBe(true);
  });

  // ── From dunning_3 (terminal dunning) ──
  it('dunning_3 → paid', () => {
    expect(isValidTransition('dunning_3', 'paid')).toBe(true);
  });

  it('dunning_3 → partially_paid', () => {
    expect(isValidTransition('dunning_3', 'partially_paid')).toBe(true);
  });

  it('dunning_3 → cancelled', () => {
    expect(isValidTransition('dunning_3', 'cancelled')).toBe(true);
  });

  it('dunning_3 → dunning_4 does not exist (invalid)', () => {
    expect(isValidTransition('dunning_3', 'dunning_4')).toBe(false);
  });

  // ── Terminal states ──
  it('paid is terminal — no transitions', () => {
    expect(isValidTransition('paid', 'draft')).toBe(false);
    expect(isValidTransition('paid', 'sent')).toBe(false);
    expect(isValidTransition('paid', 'cancelled')).toBe(false);
  });

  it('cancelled is terminal — no transitions', () => {
    expect(isValidTransition('cancelled', 'draft')).toBe(false);
    expect(isValidTransition('cancelled', 'sent')).toBe(false);
    expect(isValidTransition('cancelled', 'paid')).toBe(false);
  });

  // ── Unknown states ──
  it('unknown state returns false', () => {
    expect(isValidTransition('nonexistent', 'paid')).toBe(false);
  });
});
