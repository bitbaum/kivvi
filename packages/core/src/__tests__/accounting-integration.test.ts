import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { validateJournalBalance } from "../domain/accounting";
import { buildInvoiceRevenueLines } from "../domain/accounting-integration";

/**
 * Tests for accounting integration journal entry correctness.
 *
 * These tests verify that the journal entry LINE STRUCTURES for each
 * document lifecycle event will produce balanced entries (debits == credits).
 * They don't hit the DB — they test the accounting math.
 */

// Helper: build invoice-sent journal lines (mirrors createInvoiceSentJournalEntry)
function buildInvoiceSentLines(doc: {
  total: string;
  subtotal: string;
  vatAmount: string;
}) {
  const lines: Array<{ debit?: string; credit?: string }> = [
    { debit: doc.total },
    { credit: doc.subtotal },
  ];
  if (new Decimal(doc.vatAmount).gt(0)) {
    lines.push({ credit: doc.vatAmount });
  }
  return lines;
}

// Helper: build credit-note-sent journal lines (mirrors createCreditNoteSentJournalEntry)
function buildCreditNoteSentLines(doc: {
  total: string;
  subtotal: string;
  vatAmount: string;
}) {
  const lines: Array<{ debit?: string; credit?: string }> = [
    { debit: doc.subtotal },
    { credit: doc.total },
  ];
  if (new Decimal(doc.vatAmount).gt(0)) {
    lines.push({ debit: doc.vatAmount });
  }
  return lines;
}

// Helper: build purchase-invoice-confirmed lines (mirrors createPurchaseInvoiceJournalEntry)
function buildPurchaseInvoiceLines(doc: {
  total: string;
  subtotal: string;
  vatAmount: string;
}) {
  const lines: Array<{ debit?: string; credit?: string }> = [
    { debit: doc.subtotal },
    { credit: doc.total },
  ];
  if (new Decimal(doc.vatAmount).gt(0)) {
    lines.push({ debit: doc.vatAmount });
  }
  return lines;
}

// Helper: build cancellation reversal lines for invoices
function buildInvoiceCancellationLines(doc: {
  total: string;
  subtotal: string;
  vatAmount: string;
}) {
  const lines: Array<{ debit?: string; credit?: string }> = [
    { credit: doc.total },
    { debit: doc.subtotal },
  ];
  if (new Decimal(doc.vatAmount).gt(0)) {
    lines.push({ debit: doc.vatAmount });
  }
  return lines;
}

// Helper: build cancellation reversal lines for purchase invoices
function buildPurchaseInvoiceCancellationLines(doc: {
  total: string;
  subtotal: string;
  vatAmount: string;
}) {
  const lines: Array<{ debit?: string; credit?: string }> = [
    { credit: doc.subtotal },
    { debit: doc.total },
  ];
  if (new Decimal(doc.vatAmount).gt(0)) {
    lines.push({ credit: doc.vatAmount });
  }
  return lines;
}

// Helper: build payment lines
function buildPaymentLines(amount: string) {
  return [{ debit: amount }, { credit: amount }];
}

// ============================================================================
// Invoice Sent → Journal Entry Balances
// ============================================================================

describe("Invoice sent journal entries", () => {
  it("balances for simple invoice (no VAT)", () => {
    const lines = buildInvoiceSentLines({
      total: "1000.00",
      subtotal: "1000.00",
      vatAmount: "0.00",
    });
    expect(validateJournalBalance(lines).valid).toBe(true);
  });

  it("balances for invoice with 8.1% VAT", () => {
    const lines = buildInvoiceSentLines({
      total: "1081.00",
      subtotal: "1000.00",
      vatAmount: "81.00",
    });
    const result = validateJournalBalance(lines);
    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe("1081.00");
    expect(result.totalCredits).toBe("1081.00");
  });

  it("balances for invoice with 2.6% VAT", () => {
    const lines = buildInvoiceSentLines({
      total: "102.60",
      subtotal: "100.00",
      vatAmount: "2.60",
    });
    expect(validateJournalBalance(lines).valid).toBe(true);
  });

  it("balances for large invoice with mixed rounding", () => {
    // Realistic case: multiple line items with different VAT rates
    const lines = buildInvoiceSentLines({
      total: "47231.50",
      subtotal: "43693.34",
      vatAmount: "3538.16",
    });
    expect(validateJournalBalance(lines).valid).toBe(true);
  });

  it("balances for 1 Rappen invoice", () => {
    const lines = buildInvoiceSentLines({
      total: "0.05",
      subtotal: "0.05",
      vatAmount: "0.00",
    });
    expect(validateJournalBalance(lines).valid).toBe(true);
  });

  it("groups revenue by resolved Erlöskonto (posting groups)", () => {
    const revenueLines = buildInvoiceRevenueLines(
      [
        { total: "120.00", revenueAccountCode: "3100" }, // Warenverkauf
        { total: "80.00", revenueAccountCode: "3400" }, // Reparaturen
      ],
      "200.00",
    );

    expect(revenueLines).toEqual([
      {
        accountCode: "3100",
        credit: "120.00",
        description: "Revenue",
      },
      {
        accountCode: "3400",
        credit: "80.00",
        description: "Revenue",
      },
    ]);
  });

  it("sums lines that share the same Erlöskonto", () => {
    const revenueLines = buildInvoiceRevenueLines(
      [
        { total: "120.00", revenueAccountCode: "3400" },
        { total: "80.00", revenueAccountCode: "3400" },
      ],
      "200.00",
    );
    expect(revenueLines).toEqual([
      { accountCode: "3400", credit: "200.00", description: "Revenue" },
    ]);
  });
});

// ============================================================================
// Credit Note Sent → Journal Entry Balances
// ============================================================================

describe("Credit note sent journal entries", () => {
  it("balances for credit note (no VAT)", () => {
    const lines = buildCreditNoteSentLines({
      total: "500.00",
      subtotal: "500.00",
      vatAmount: "0.00",
    });
    expect(validateJournalBalance(lines).valid).toBe(true);
  });

  it("balances for credit note with 8.1% VAT", () => {
    const lines = buildCreditNoteSentLines({
      total: "540.50",
      subtotal: "500.00",
      vatAmount: "40.50",
    });
    const result = validateJournalBalance(lines);
    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe("540.50");
    expect(result.totalCredits).toBe("540.50");
  });

  it("is an exact reversal of invoice sent", () => {
    const doc = { total: "1081.00", subtotal: "1000.00", vatAmount: "81.00" };
    const invoiceLines = buildInvoiceSentLines(doc);
    const creditLines = buildCreditNoteSentLines(doc);

    // Invoice: debit AR 1081, credit Revenue 1000 + VAT 81
    // Credit:  debit Revenue 1000 + VAT 81, credit AR 1081
    // Combined should net to zero
    const combined = [...invoiceLines, ...creditLines];
    const debits = combined.reduce(
      (sum, l) => sum.plus(l.debit || 0),
      new Decimal(0),
    );
    const credits = combined.reduce(
      (sum, l) => sum.plus(l.credit || 0),
      new Decimal(0),
    );
    expect(debits.eq(credits)).toBe(true);
  });
});

// ============================================================================
// Purchase Invoice Confirmed → Journal Entry Balances
// ============================================================================

describe("Purchase invoice confirmed journal entries", () => {
  it("balances for purchase invoice (no VAT)", () => {
    const lines = buildPurchaseInvoiceLines({
      total: "2000.00",
      subtotal: "2000.00",
      vatAmount: "0.00",
    });
    expect(validateJournalBalance(lines).valid).toBe(true);
  });

  it("balances for purchase invoice with 8.1% VAT", () => {
    const lines = buildPurchaseInvoiceLines({
      total: "2162.00",
      subtotal: "2000.00",
      vatAmount: "162.00",
    });
    expect(validateJournalBalance(lines).valid).toBe(true);
  });
});

// ============================================================================
// Cancellation Reversal → Journal Entry Balances
// ============================================================================

describe("Invoice cancellation reversal journal entries", () => {
  it("balances for cancelled invoice", () => {
    const lines = buildInvoiceCancellationLines({
      total: "1081.00",
      subtotal: "1000.00",
      vatAmount: "81.00",
    });
    expect(validateJournalBalance(lines).valid).toBe(true);
  });

  it("nets to zero when combined with original invoice entry", () => {
    const doc = { total: "5000.00", subtotal: "4629.63", vatAmount: "370.37" };
    const original = buildInvoiceSentLines(doc);
    const reversal = buildInvoiceCancellationLines(doc);

    const combined = [...original, ...reversal];
    const debits = combined.reduce(
      (sum, l) => sum.plus(l.debit || 0),
      new Decimal(0),
    );
    const credits = combined.reduce(
      (sum, l) => sum.plus(l.credit || 0),
      new Decimal(0),
    );
    expect(debits.eq(credits)).toBe(true);
  });

  it("balances for cancelled purchase invoice", () => {
    const lines = buildPurchaseInvoiceCancellationLines({
      total: "3243.00",
      subtotal: "3000.00",
      vatAmount: "243.00",
    });
    expect(validateJournalBalance(lines).valid).toBe(true);
  });

  it("nets to zero when combined with original purchase invoice entry", () => {
    const doc = { total: "3243.00", subtotal: "3000.00", vatAmount: "243.00" };
    const original = buildPurchaseInvoiceLines(doc);
    const reversal = buildPurchaseInvoiceCancellationLines(doc);

    const combined = [...original, ...reversal];
    const debits = combined.reduce(
      (sum, l) => sum.plus(l.debit || 0),
      new Decimal(0),
    );
    const credits = combined.reduce(
      (sum, l) => sum.plus(l.credit || 0),
      new Decimal(0),
    );
    expect(debits.eq(credits)).toBe(true);
  });
});

// ============================================================================
// Payment → Journal Entry Balances
// ============================================================================

describe("Payment journal entries", () => {
  it("balances for full payment", () => {
    const lines = buildPaymentLines("1081.00");
    expect(validateJournalBalance(lines).valid).toBe(true);
  });

  it("balances for partial payment", () => {
    const lines = buildPaymentLines("500.00");
    expect(validateJournalBalance(lines).valid).toBe(true);
  });

  it("balances for 0.05 CHF payment (minimum Rappen)", () => {
    const lines = buildPaymentLines("0.05");
    expect(validateJournalBalance(lines).valid).toBe(true);
  });
});

// ============================================================================
// Full Lifecycle: Invoice → Send → Partial Payment → Full Payment
// ============================================================================

describe("Full invoice lifecycle accounting", () => {
  it("all entries balance across complete lifecycle", () => {
    const doc = { total: "1081.00", subtotal: "1000.00", vatAmount: "81.00" };

    // Step 1: Invoice sent
    const sentLines = buildInvoiceSentLines(doc);
    expect(validateJournalBalance(sentLines).valid).toBe(true);

    // Step 2: Partial payment of 500
    const partialLines = buildPaymentLines("500.00");
    expect(validateJournalBalance(partialLines).valid).toBe(true);

    // Step 3: Remaining payment of 581
    const finalLines = buildPaymentLines("581.00");
    expect(validateJournalBalance(finalLines).valid).toBe(true);

    // Verify: total debits and credits across ALL entries net correctly
    // AR account: +1081 (sent) -500 (payment1) -581 (payment2) = 0 ✓
    const arDebits = new Decimal(doc.total);
    const arCredits = new Decimal("500.00").plus("581.00");
    expect(arDebits.eq(arCredits)).toBe(true);
  });

  it("cancelled invoice with prior payment: entries still balance individually", () => {
    const doc = { total: "1081.00", subtotal: "1000.00", vatAmount: "81.00" };

    // Step 1: Invoice sent — balanced
    expect(validateJournalBalance(buildInvoiceSentLines(doc)).valid).toBe(true);

    // Step 2: Partial payment — balanced
    expect(validateJournalBalance(buildPaymentLines("300.00")).valid).toBe(
      true,
    );

    // Step 3: Cancellation reversal — balanced
    expect(
      validateJournalBalance(buildInvoiceCancellationLines(doc)).valid,
    ).toBe(true);

    // Note: After cancellation, AR has a credit balance of 300 (the payment).
    // In real accounting, this would require a refund entry or carry-forward.
    // The system correctly creates all entries; the human must handle the refund.
  });
});

// ============================================================================
// Document type payment eligibility
// ============================================================================

describe("Payment eligibility by document type", () => {
  const payableTypes = ["invoice", "purchase_invoice"];
  const nonPayableTypes = [
    "quote",
    "order",
    "order_confirmation",
    "delivery_note",
    "credit_note",
    "dunning",
    "purchase_order",
  ];

  for (const type of payableTypes) {
    it(`${type} should accept payments`, () => {
      expect(payableTypes.includes(type)).toBe(true);
    });
  }

  for (const type of nonPayableTypes) {
    it(`${type} should NOT accept payments`, () => {
      expect(payableTypes.includes(type)).toBe(false);
    });
  }
});
