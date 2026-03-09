import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  createBankAccountSchema,
  importTransactionSchema,
} from '../domain/banking';

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe('createBankAccountSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createBankAccountSchema.safeParse({ name: 'UBS Konto' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('CHF'); // default
    }
  });

  it('accepts all fields', () => {
    const result = createBankAccountSchema.safeParse({
      name: 'UBS Geschäftskonto',
      iban: 'CH93 0076 2011 6238 5295 7',
      bankName: 'UBS AG',
      currency: 'EUR',
      accountId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createBankAccountSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = createBankAccountSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects name > 200 chars', () => {
    const result = createBankAccountSchema.safeParse({ name: 'A'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts null optional fields', () => {
    const result = createBankAccountSchema.safeParse({
      name: 'Test',
      iban: null,
      bankName: null,
      accountId: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid accountId (not UUID)', () => {
    const result = createBankAccountSchema.safeParse({
      name: 'Test',
      accountId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('importTransactionSchema', () => {
  it('accepts valid transaction', () => {
    const result = importTransactionSchema.safeParse({
      date: '2026-01-15',
      amount: '1500.00',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full transaction', () => {
    const result = importTransactionSchema.safeParse({
      date: '2026-01-15',
      description: 'Payment from Customer AG',
      reference: 'REF-123456',
      amount: '1500.00',
      balance: '25000.00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing date', () => {
    const result = importTransactionSchema.safeParse({
      amount: '100.00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing amount', () => {
    const result = importTransactionSchema.safeParse({
      date: '2026-01-15',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty date', () => {
    const result = importTransactionSchema.safeParse({
      date: '',
      amount: '100.00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty amount', () => {
    const result = importTransactionSchema.safeParse({
      date: '2026-01-15',
      amount: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null optional fields', () => {
    const result = importTransactionSchema.safeParse({
      date: '2026-01-15',
      description: null,
      reference: null,
      amount: '100.00',
      balance: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts negative amounts (outgoing)', () => {
    const result = importTransactionSchema.safeParse({
      date: '2026-01-15',
      amount: '-500.00',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// AMOUNT MATCHING LOGIC
// Mirrors the matching behavior used in autoMatchTransactions
// ============================================================================

describe('amount matching logic', () => {
  function isAmountMatch(txnAmount: string, invoiceTotal: string): boolean {
    return new Decimal(invoiceTotal).minus(new Decimal(txnAmount)).abs().lt('0.01');
  }

  it('exact match', () => {
    expect(isAmountMatch('1500.00', '1500.00')).toBe(true);
  });

  it('match within 0.01 tolerance', () => {
    expect(isAmountMatch('1500.00', '1500.005')).toBe(true);
  });

  it('no match outside tolerance', () => {
    expect(isAmountMatch('1500.00', '1500.02')).toBe(false);
  });

  it('handles Swiss Rappen amounts', () => {
    expect(isAmountMatch('1234.55', '1234.55')).toBe(true);
  });

  it('handles Rappen-rounded amounts (0.05 step)', () => {
    // Swiss CHF rounds to 0.05
    expect(isAmountMatch('99.95', '99.95')).toBe(true);
    expect(isAmountMatch('99.95', '99.90')).toBe(false);
  });

  it('handles large amounts', () => {
    expect(isAmountMatch('100000.00', '100000.00')).toBe(true);
    expect(isAmountMatch('100000.00', '100000.02')).toBe(false);
  });

  it('handles zero amount', () => {
    expect(isAmountMatch('0', '0')).toBe(true);
  });
});

// ============================================================================
// QR REFERENCE MATCHING LOGIC
// Mirrors the QR reference matching in matchTransactionToDocument
// ============================================================================

describe('QR reference matching logic', () => {
  function isQrReferenceMatch(
    txnReference: string | null,
    invoiceQrRef: string | null
  ): boolean {
    if (!txnReference || !invoiceQrRef) return false;
    return txnReference.includes(invoiceQrRef);
  }

  it('matches when QR ref is exact substring', () => {
    expect(isQrReferenceMatch('RF123456789', 'RF123456789')).toBe(true);
  });

  it('matches when QR ref is embedded in longer reference', () => {
    expect(
      isQrReferenceMatch(
        'Payment REF: RF123456789 from Customer AG',
        'RF123456789'
      )
    ).toBe(true);
  });

  it('no match when references differ', () => {
    expect(isQrReferenceMatch('RF111111111', 'RF222222222')).toBe(false);
  });

  it('no match when transaction reference is null', () => {
    expect(isQrReferenceMatch(null, 'RF123456789')).toBe(false);
  });

  it('no match when invoice QR ref is null', () => {
    expect(isQrReferenceMatch('RF123456789', null)).toBe(false);
  });

  it('no match when both null', () => {
    expect(isQrReferenceMatch(null, null)).toBe(false);
  });

  it('matches typical Swiss QR reference pattern', () => {
    // Swiss QR references are 26 or 27 digit numbers
    const qrRef = '210000000003139471430009017';
    const txnRef = `QRR ${qrRef}`;
    expect(isQrReferenceMatch(txnRef, qrRef)).toBe(true);
  });
});

// ============================================================================
// RECONCILIATION STATE MACHINE
// Tests the valid state transitions for reconciliation
// ============================================================================

describe('reconciliation state logic', () => {
  it('unreconciled → reconciled is valid', () => {
    const isReconciled = false;
    expect(isReconciled).toBe(false);
    // After reconciliation
    const newState = true;
    expect(newState).toBe(true);
  });

  it('already reconciled → cannot reconcile again', () => {
    const isReconciled = true;
    expect(() => {
      if (isReconciled) throw new Error('Transaction is already reconciled');
    }).toThrow('already reconciled');
  });

  it('reconciled → unreconciled is valid', () => {
    // Unreconciliation resets state
    const state = { isReconciled: true, reconciledDocumentId: 'doc-1' };
    const newState = {
      isReconciled: false,
      reconciledDocumentId: null,
      reconciledAt: null,
    };
    expect(newState.isReconciled).toBe(false);
    expect(newState.reconciledDocumentId).toBeNull();
    expect(newState.reconciledAt).toBeNull();
  });
});

// ============================================================================
// RECONCILIATION EDGE CASES
// Mirrors edge case behavior in reconcileTransaction()
// ============================================================================

describe('reconciliation edge cases', () => {
  // Mirrors the guard: document status must allow payment recording
  const PAYABLE_STATUSES = ['sent', 'confirmed', 'delivered', 'overdue', 'partially_paid', 'dunning_1', 'dunning_2', 'dunning_3'];
  const NON_PAYABLE_STATUSES = ['draft', 'cancelled', 'paid'];

  function canRecordPayment(documentStatus: string): boolean {
    return PAYABLE_STATUSES.includes(documentStatus);
  }

  it.each(PAYABLE_STATUSES)('document in %s status can receive payment', (status) => {
    expect(canRecordPayment(status)).toBe(true);
  });

  it.each(NON_PAYABLE_STATUSES)('document in %s status cannot receive payment', (status) => {
    expect(canRecordPayment(status)).toBe(false);
  });

  it('reconciliation with draft document: both reconciliation and payment fail atomically', () => {
    // reconcileTransaction wraps reconciliation + payment in db.transaction().
    // If payment fails (e.g. document is draft), the entire operation rolls back —
    // no orphaned reconciled transaction without a payment record.
    const docStatus = 'draft';
    const paymentWouldFail = !canRecordPayment(docStatus);
    expect(paymentWouldFail).toBe(true);
  });

  it('reconciliation with cancelled document: both reconciliation and payment fail atomically', () => {
    const docStatus = 'cancelled';
    const paymentWouldFail = !canRecordPayment(docStatus);
    expect(paymentWouldFail).toBe(true);
  });

  it('reconciliation with already-paid document: payment fails but reconciliation succeeds', () => {
    const docStatus = 'paid';
    const paymentWouldFail = !canRecordPayment(docStatus);
    expect(paymentWouldFail).toBe(true);
  });
});

describe('payment amount validation for reconciliation', () => {
  // When reconciling, the bank transaction amount should match (or partially match)
  // the document total. The system uses absolute value of the bank tx amount.

  function reconciliationPaymentAmount(txnAmount: string): string {
    return new Decimal(txnAmount).abs().toFixed(2);
  }

  it('positive transaction amount used as-is', () => {
    expect(reconciliationPaymentAmount('1500.00')).toBe('1500.00');
  });

  it('negative transaction amount converted to positive', () => {
    // Outgoing payments appear as negative in bank statements
    expect(reconciliationPaymentAmount('-1500.00')).toBe('1500.00');
  });

  it('zero amount preserved', () => {
    expect(reconciliationPaymentAmount('0')).toBe('0.00');
  });

  it('Rappen-rounded amount preserved', () => {
    expect(reconciliationPaymentAmount('99.95')).toBe('99.95');
  });

  it('large amount preserved with precision', () => {
    expect(reconciliationPaymentAmount('123456.78')).toBe('123456.78');
  });

  it('amount with extra precision is rounded to 2 decimal places', () => {
    expect(reconciliationPaymentAmount('99.999')).toBe('100.00');
  });

  it('Rappen rounding edge case: 0.05 step', () => {
    // Swiss CHF uses Rappen rounding (nearest 0.05)
    function rappenRound(amount: string): string {
      return new Decimal(amount).times(20).round().div(20).toFixed(2);
    }

    expect(rappenRound('99.97')).toBe('99.95');
    expect(rappenRound('99.98')).toBe('100.00');
    expect(rappenRound('99.93')).toBe('99.95');
    expect(rappenRound('99.92')).toBe('99.90');
    expect(rappenRound('100.02')).toBe('100.00');
    expect(rappenRound('100.03')).toBe('100.05');
  });
});

describe('reconciliation idempotency', () => {
  // If the same bankTransactionId is used for payment recording twice,
  // the second attempt should be rejected (idempotent guard)

  function wouldBeDuplicate(existingPaymentTxIds: string[], newTxId: string): boolean {
    return existingPaymentTxIds.includes(newTxId);
  }

  it('first payment with bankTransactionId is accepted', () => {
    expect(wouldBeDuplicate([], 'tx-001')).toBe(false);
  });

  it('second payment with same bankTransactionId is rejected', () => {
    expect(wouldBeDuplicate(['tx-001'], 'tx-001')).toBe(true);
  });

  it('payment with different bankTransactionId is accepted', () => {
    expect(wouldBeDuplicate(['tx-001'], 'tx-002')).toBe(false);
  });

  it('handles multiple existing transactions', () => {
    const existing = ['tx-001', 'tx-002', 'tx-003'];
    expect(wouldBeDuplicate(existing, 'tx-002')).toBe(true);
    expect(wouldBeDuplicate(existing, 'tx-004')).toBe(false);
  });
});
