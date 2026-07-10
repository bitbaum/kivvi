import { describe, it, expect } from "vitest";
import { classifyMoneyIn } from "../domain/payment-classification";

describe("classifyMoneyIn", () => {
  it("classifies a matched invoice as a clean sale, no review needed", () => {
    const c = classifyMoneyIn({
      amount: "120.00",
      description: "Zahlung RE-2026-00042",
      matchedInvoiceId: "inv-1",
    });
    expect(c.category).toBe("sale");
    expect(c.confidence).toBe("high");
    expect(c.requiresReview).toBe(false);
  });

  it("flags a pass-through settlement above everything else", () => {
    const c = classifyMoneyIn({
      amount: "200.00",
      description: "Ricardo Auszahlung",
      matchedInvoiceId: "inv-1",
      isPassThrough: true,
    });
    expect(c.category).toBe("pass_through");
    expect(c.requiresReview).toBe(true);
  });

  it("treats an outflow as a refund with high confidence", () => {
    const c = classifyMoneyIn({ amount: "-50.00", description: "" });
    expect(c.category).toBe("refund");
    expect(c.confidence).toBe("high");
    expect(c.requiresReview).toBe(true);
  });

  it("detects a reversal by wording even on an inflow", () => {
    const c = classifyMoneyIn({
      amount: "30.00",
      description: "Rückerstattung Kurs",
    });
    expect(c.category).toBe("refund");
  });

  it("flags grants/subventions for Treuhänder review", () => {
    const c = classifyMoneyIn({
      amount: "5000.00",
      description: "Subvention Kanton Zürich",
    });
    expect(c.category).toBe("grant");
    expect(c.requiresReview).toBe(true);
  });

  it("flags donations for review", () => {
    const c = classifyMoneyIn({
      amount: "100.00",
      counterparty: "Spende Familie Muster",
    });
    expect(c.category).toBe("donation");
    expect(c.requiresReview).toBe(true);
  });

  it("prioritises grant wording over an incidental invoice match", () => {
    const c = classifyMoneyIn({
      amount: "5000.00",
      description: "Förderbeitrag Stiftung",
      matchedInvoiceId: "inv-1",
    });
    expect(c.category).toBe("grant");
  });

  it("falls back to manual review when nothing is conclusive", () => {
    const c = classifyMoneyIn({
      amount: "77.00",
      description: "TWINT 0791234567",
    });
    expect(c.category).toBe("manual_review");
    expect(c.confidence).toBe("low");
    expect(c.requiresReview).toBe(true);
  });
});
