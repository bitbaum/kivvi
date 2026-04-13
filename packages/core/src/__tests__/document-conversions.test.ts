import { describe, it, expect } from "vitest";
import {
  VALID_CONVERSIONS,
  DOCUMENT_TYPE_LABELS_DE,
} from "../domain/document-conversions";

// ============================================================================
// VALID_CONVERSIONS
// ============================================================================

describe("VALID_CONVERSIONS", () => {
  it("allows quote to convert to order and invoice", () => {
    expect(VALID_CONVERSIONS.quote).toEqual(["order", "invoice"]);
  });

  it("allows order to convert to order_confirmation, delivery_note, and invoice", () => {
    expect(VALID_CONVERSIONS.order).toEqual([
      "order_confirmation",
      "delivery_note",
      "invoice",
    ]);
  });

  it("allows order_confirmation to convert to delivery_note and invoice", () => {
    expect(VALID_CONVERSIONS.order_confirmation).toEqual([
      "delivery_note",
      "invoice",
    ]);
  });

  it("allows delivery_note to convert to invoice", () => {
    expect(VALID_CONVERSIONS.delivery_note).toEqual(["invoice"]);
  });

  it("allows invoice to convert to credit_note only", () => {
    expect(VALID_CONVERSIONS.invoice).toEqual(["credit_note"]);
  });

  it("allows purchase_order to convert to purchase_invoice", () => {
    expect(VALID_CONVERSIONS.purchase_order).toEqual(["purchase_invoice"]);
  });

  it("does not define conversions for credit_note (terminal type)", () => {
    expect(VALID_CONVERSIONS.credit_note).toBeUndefined();
  });

  it("does not define conversions for dunning (terminal type)", () => {
    expect(VALID_CONVERSIONS.dunning).toBeUndefined();
  });

  it("does not define conversions for purchase_invoice (terminal type)", () => {
    expect(VALID_CONVERSIONS.purchase_invoice).toBeUndefined();
  });

  it("does not allow invoice to convert back to quote", () => {
    const invoiceTargets = VALID_CONVERSIONS.invoice ?? [];
    expect(invoiceTargets).not.toContain("quote");
  });

  it("does not allow invoice to convert to order", () => {
    const invoiceTargets = VALID_CONVERSIONS.invoice ?? [];
    expect(invoiceTargets).not.toContain("order");
  });

  it("does not allow credit_note to convert to anything", () => {
    const creditNoteTargets = VALID_CONVERSIONS.credit_note;
    expect(creditNoteTargets).toBeUndefined();
  });

  it("covers the complete sales flow: quote -> order -> delivery_note -> invoice -> credit_note", () => {
    // Verify each step of the sales pipeline is a valid conversion
    expect(VALID_CONVERSIONS.quote).toContain("order");
    expect(VALID_CONVERSIONS.order).toContain("delivery_note");
    expect(VALID_CONVERSIONS.delivery_note).toContain("invoice");
    expect(VALID_CONVERSIONS.invoice).toContain("credit_note");
  });

  it("covers the purchase flow: purchase_order -> purchase_invoice", () => {
    expect(VALID_CONVERSIONS.purchase_order).toContain("purchase_invoice");
  });

  it("allows shortcut: quote directly to invoice", () => {
    expect(VALID_CONVERSIONS.quote).toContain("invoice");
  });

  it("allows shortcut: order directly to invoice", () => {
    expect(VALID_CONVERSIONS.order).toContain("invoice");
  });
});

// ============================================================================
// DOCUMENT_TYPE_LABELS_DE
// ============================================================================

describe("DOCUMENT_TYPE_LABELS_DE", () => {
  it("defines labels for all 9 document types", () => {
    const expectedTypes = [
      "invoice",
      "quote",
      "order",
      "order_confirmation",
      "credit_note",
      "delivery_note",
      "dunning",
      "purchase_order",
      "purchase_invoice",
      "intake",
    ];
    expect(Object.keys(DOCUMENT_TYPE_LABELS_DE).sort()).toEqual(
      expectedTypes.sort(),
    );
  });

  it("has correct German label for invoice", () => {
    expect(DOCUMENT_TYPE_LABELS_DE.invoice).toBe("Rechnung");
  });

  it("has correct German label for quote", () => {
    expect(DOCUMENT_TYPE_LABELS_DE.quote).toBe("Angebot");
  });

  it("has correct German label for order", () => {
    expect(DOCUMENT_TYPE_LABELS_DE.order).toBe("Auftrag");
  });

  it("has correct German label for order_confirmation", () => {
    expect(DOCUMENT_TYPE_LABELS_DE.order_confirmation).toBe(
      "Auftragsbestätigung",
    );
  });

  it("has correct German label for credit_note", () => {
    expect(DOCUMENT_TYPE_LABELS_DE.credit_note).toBe("Gutschrift");
  });

  it("has correct German label for delivery_note", () => {
    expect(DOCUMENT_TYPE_LABELS_DE.delivery_note).toBe("Lieferschein");
  });

  it("has correct German label for dunning", () => {
    expect(DOCUMENT_TYPE_LABELS_DE.dunning).toBe("Zahlungserinnerung");
  });

  it("has correct German label for purchase_order", () => {
    expect(DOCUMENT_TYPE_LABELS_DE.purchase_order).toBe("Bestellung");
  });

  it("has correct German label for purchase_invoice", () => {
    expect(DOCUMENT_TYPE_LABELS_DE.purchase_invoice).toBe("Eingangsrechnung");
  });

  it("has no empty labels", () => {
    for (const [type, label] of Object.entries(DOCUMENT_TYPE_LABELS_DE)) {
      expect(
        label.length,
        `Label for ${type} should not be empty`,
      ).toBeGreaterThan(0);
    }
  });
});
