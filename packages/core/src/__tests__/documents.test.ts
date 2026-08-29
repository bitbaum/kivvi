import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getOverdueInfo,
  calculateOutstandingAmount,
  createDocumentSchema,
  createRepairLaborInvoiceSchema,
  calculateRepairLaborAmount,
  updateDocumentSchema,
} from "../domain/documents";
import { VALID_CONVERSIONS } from "../domain/document-conversions";

// ============================================================================
// getOverdueInfo — pure function, no DB required
// ============================================================================

describe("getOverdueInfo", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("not overdue when status is paid", () => {
    const result = getOverdueInfo({
      status: "paid",
      dueDate: "2020-01-01", // far in the past
    });
    expect(result.isOverdue).toBe(false);
    expect(result.daysOverdue).toBe(0);
  });

  it("not overdue when status is cancelled", () => {
    const result = getOverdueInfo({
      status: "cancelled",
      dueDate: "2020-01-01",
    });
    expect(result.isOverdue).toBe(false);
    expect(result.daysOverdue).toBe(0);
  });

  it("not overdue when status is draft", () => {
    const result = getOverdueInfo({
      status: "draft",
      dueDate: "2020-01-01",
    });
    expect(result.isOverdue).toBe(false);
    expect(result.daysOverdue).toBe(0);
  });

  it("not overdue when dueDate is null", () => {
    const result = getOverdueInfo({
      status: "sent",
      dueDate: null,
    });
    expect(result.isOverdue).toBe(false);
    expect(result.daysOverdue).toBe(0);
  });

  it("not overdue when dueDate is in the future", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const result = getOverdueInfo({
      status: "sent",
      dueDate: futureDate.toISOString(),
    });
    expect(result.isOverdue).toBe(false);
    expect(result.daysOverdue).toBe(0);
  });

  it("overdue when sent and dueDate is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-24T12:00:00Z"));

    const result = getOverdueInfo({
      status: "sent",
      dueDate: "2026-02-14",
    });
    expect(result.isOverdue).toBe(true);
    expect(result.daysOverdue).toBe(10);
  });

  it("overdue when confirmed and dueDate is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));

    const result = getOverdueInfo({
      status: "confirmed",
      dueDate: "2026-02-01",
    });
    expect(result.isOverdue).toBe(true);
    expect(result.daysOverdue).toBe(28);
  });

  it("overdue when partially_paid and dueDate is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-24T12:00:00Z"));

    const result = getOverdueInfo({
      status: "partially_paid",
      dueDate: "2026-02-23",
    });
    expect(result.isOverdue).toBe(true);
    expect(result.daysOverdue).toBe(1);
  });

  it("overdue when delivered and dueDate is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-24T12:00:00Z"));

    const result = getOverdueInfo({
      status: "delivered",
      dueDate: "2026-01-24",
    });
    expect(result.isOverdue).toBe(true);
    expect(result.daysOverdue).toBe(31);
  });

  it("overdue when in dunning status and dueDate is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-24T12:00:00Z"));

    const result = getOverdueInfo({
      status: "dunning_1",
      dueDate: "2026-01-01",
    });
    expect(result.isOverdue).toBe(true);
    expect(result.daysOverdue).toBe(54);
  });

  it("accepts Date object for dueDate", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-24T12:00:00Z"));

    const result = getOverdueInfo({
      status: "sent",
      dueDate: new Date("2026-02-20"),
    });
    expect(result.isOverdue).toBe(true);
    expect(result.daysOverdue).toBeGreaterThan(0);
  });

  it("daysOverdue is 0 when not overdue", () => {
    const result = getOverdueInfo({
      status: "paid",
      dueDate: "2020-01-01",
    });
    expect(result.daysOverdue).toBe(0);
  });
});

// ============================================================================
// VALID_CONVERSIONS — pure constant, no DB required
// ============================================================================

describe("VALID_CONVERSIONS", () => {
  it("quote can convert to order and invoice", () => {
    expect(VALID_CONVERSIONS.quote).toEqual(["order", "invoice"]);
  });

  it("order can convert to order_confirmation, delivery_note, and invoice", () => {
    expect(VALID_CONVERSIONS.order).toEqual(["order_confirmation", "delivery_note", "invoice"]);
  });

  it("order_confirmation can convert to delivery_note and invoice", () => {
    expect(VALID_CONVERSIONS.order_confirmation).toEqual(["delivery_note", "invoice"]);
  });

  it("delivery_note can convert to invoice", () => {
    expect(VALID_CONVERSIONS.delivery_note).toEqual(["invoice"]);
  });

  it("invoice can convert to credit_note", () => {
    expect(VALID_CONVERSIONS.invoice).toEqual(["credit_note"]);
  });

  it("purchase_order can convert to purchase_invoice", () => {
    expect(VALID_CONVERSIONS.purchase_order).toEqual(["purchase_invoice"]);
  });

  it("credit_note has no conversion targets", () => {
    expect(VALID_CONVERSIONS.credit_note).toBeUndefined();
  });

  it("purchase_invoice has no conversion targets", () => {
    expect(VALID_CONVERSIONS.purchase_invoice).toBeUndefined();
  });

  it("dunning has no conversion targets", () => {
    expect(VALID_CONVERSIONS.dunning).toBeUndefined();
  });

  // Verify the full chain: quote -> order -> invoice -> credit_note
  it("supports full document lifecycle chain", () => {
    expect(VALID_CONVERSIONS.quote).toContain("order");
    expect(VALID_CONVERSIONS.order).toContain("invoice");
    expect(VALID_CONVERSIONS.invoice).toContain("credit_note");
  });

  // Verify no backwards conversions exist
  it("does not allow backwards conversions (invoice -> quote)", () => {
    expect(VALID_CONVERSIONS.invoice).not.toContain("quote");
  });

  it("does not allow backwards conversions (order -> quote)", () => {
    expect(VALID_CONVERSIONS.order).not.toContain("quote");
  });

  it("does not allow invoice -> invoice (self-conversion)", () => {
    expect(VALID_CONVERSIONS.invoice).not.toContain("invoice");
  });
});

// ============================================================================
// createDocumentSchema — Zod validation, no DB required
// ============================================================================

describe("createDocumentSchema", () => {
  const validInput = {
    type: "invoice" as const,
    contactId: "550e8400-e29b-41d4-a716-446655440000",
    items: [
      {
        position: 0,
        description: "Consulting",
        quantity: "10",
        unitPrice: "150.00",
        discount: "0",
        vatRate: "8.1",
      },
    ],
  };

  it("accepts valid minimal input", () => {
    const result = createDocumentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts all valid document types", () => {
    const types = [
      "quote",
      "order",
      "order_confirmation",
      "delivery_note",
      "invoice",
      "credit_note",
      "purchase_order",
      "purchase_invoice",
      "dunning",
    ];

    for (const type of types) {
      const result = createDocumentSchema.safeParse({ ...validInput, type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid document type", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      type: "receipt",
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one line item", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      items: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const itemsError = result.error.issues.find((i) => i.path.includes("items"));
      expect(itemsError).toBeDefined();
    }
  });

  it("requires item description", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      items: [{ ...validInput.items[0], description: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative position", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      items: [{ ...validInput.items[0], position: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid quantity format", () => {
    const cases = ["abc", "-1", "1.12345", ""];
    for (const quantity of cases) {
      const result = createDocumentSchema.safeParse({
        ...validInput,
        items: [{ ...validInput.items[0], quantity }],
      });
      expect(result.success).toBe(false);
    }
  });

  it("accepts valid quantity formats", () => {
    const cases = ["1", "100", "2.5", "0.1234"];
    for (const quantity of cases) {
      const result = createDocumentSchema.safeParse({
        ...validInput,
        items: [{ ...validInput.items[0], quantity }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid unit price format", () => {
    const cases = ["abc", "-10", "1.123"];
    for (const unitPrice of cases) {
      const result = createDocumentSchema.safeParse({
        ...validInput,
        items: [{ ...validInput.items[0], unitPrice }],
      });
      expect(result.success).toBe(false);
    }
  });

  it("accepts valid unit price formats", () => {
    const cases = ["0", "100", "99.99", "9999.50"];
    for (const unitPrice of cases) {
      const result = createDocumentSchema.safeParse({
        ...validInput,
        items: [{ ...validInput.items[0], unitPrice }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects discount over 100%", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      items: [{ ...validInput.items[0], discount: "100.01" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts 100% discount", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      items: [{ ...validInput.items[0], discount: "100" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts 0% discount", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      items: [{ ...validInput.items[0], discount: "0" }],
    });
    expect(result.success).toBe(true);
  });

  it("defaults discount to 0", () => {
    const input = {
      ...validInput,
      items: [
        {
          position: 0,
          description: "Test",
          quantity: "1",
          unitPrice: "100.00",
          vatRate: "8.1",
          // no discount provided
        },
      ],
    };
    const result = createDocumentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].discount).toBe("0");
    }
  });

  it("defaults vatRate to 8.1% (Swiss standard)", () => {
    const input = {
      ...validInput,
      items: [
        {
          position: 0,
          description: "Test",
          quantity: "1",
          unitPrice: "100.00",
          discount: "0",
          // no vatRate provided
        },
      ],
    };
    const result = createDocumentSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].vatRate).toBe("8.1");
    }
  });

  it("defaults currency to CHF", () => {
    const result = createDocumentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("CHF");
    }
  });

  it("allows optional nullable fields", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      contactId: null,
      projectId: null,
      dueDate: null,
      deliveryDate: null,
      notes: null,
      internalNotes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects notes exceeding 5000 characters", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      notes: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts notes at 5000 characters", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      notes: "x".repeat(5000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid contactId format (not UUID)", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      contactId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid projectId format (not UUID)", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      projectId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional productId on line items", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      items: [
        {
          ...validInput.items[0],
          productId: "550e8400-e29b-41d4-a716-446655440000",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid productId format on line items", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      items: [{ ...validInput.items[0], productId: "bad-id" }],
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Repair labor billing
// ============================================================================

describe("repair labor billing helpers", () => {
  it("calculates repair labor amount from hours and hourly rate", () => {
    expect(calculateRepairLaborAmount("3.5", "95.00")).toBe("332.50");
  });

  it("validates repair labor invoice input", () => {
    const result = createRepairLaborInvoiceSchema.safeParse({
      itemId: "550e8400-e29b-41d4-a716-446655440000",
      contactId: "550e8400-e29b-41d4-a716-446655440001",
      hours: "2.25",
      hourlyRate: "95.00",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vatRate).toBe("8.1");
    }
  });
});

// ============================================================================
// updateDocumentSchema — Zod validation, no DB required
// ============================================================================

describe("updateDocumentSchema", () => {
  it("accepts empty input (all fields optional)", () => {
    const result = updateDocumentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial updates (notes only)", () => {
    const result = updateDocumentSchema.safeParse({
      notes: "Updated notes",
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates (items only)", () => {
    const result = updateDocumentSchema.safeParse({
      items: [
        {
          position: 0,
          description: "Updated item",
          quantity: "5",
          unitPrice: "200.00",
          discount: "0",
          vatRate: "8.1",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items array when provided", () => {
    const result = updateDocumentSchema.safeParse({
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("does not include type field (cannot change document type via update)", () => {
    // The schema should not have type — type changes happen via conversion
    const result = updateDocumentSchema.safeParse({
      type: "invoice",
      notes: "test",
    });
    // type is not in the schema, so it will be stripped (Zod default strips unknown keys)
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).type).toBeUndefined();
    }
  });

  it("rejects notes exceeding 5000 characters", () => {
    const result = updateDocumentSchema.safeParse({
      notes: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects internalNotes exceeding 5000 characters", () => {
    const result = updateDocumentSchema.safeParse({
      internalNotes: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// calculateOutstandingAmount — pure Decimal math, no DB required
// ============================================================================

describe("calculateOutstandingAmount", () => {
  it("returns the full total when there are no payments (undefined)", () => {
    const result = calculateOutstandingAmount({ total: "100.00" });
    expect(result.toString()).toBe("100");
  });

  it("returns the full total when payments is null", () => {
    const result = calculateOutstandingAmount({
      total: "100.00",
      payments: null,
    });
    expect(result.toString()).toBe("100");
  });

  it("returns the full total when payments is an empty array", () => {
    const result = calculateOutstandingAmount({
      total: "100.00",
      payments: [],
    });
    expect(result.toString()).toBe("100");
  });

  it("subtracts a single partial payment", () => {
    const result = calculateOutstandingAmount({
      total: "100.00",
      payments: [{ amount: "40.00" }],
    });
    expect(result.toString()).toBe("60");
  });

  it("returns zero when a single payment settles the total exactly", () => {
    const result = calculateOutstandingAmount({
      total: "100.00",
      payments: [{ amount: "100.00" }],
    });
    expect(result.isZero()).toBe(true);
    expect(result.toString()).toBe("0");
  });

  it("sums multiple payments before subtracting", () => {
    const result = calculateOutstandingAmount({
      total: "100.00",
      payments: [{ amount: "30.00" }, { amount: "25.50" }, { amount: "4.50" }],
    });
    expect(result.toString()).toBe("40");
  });

  it("returns a negative amount on overpayment", () => {
    const result = calculateOutstandingAmount({
      total: "100.00",
      payments: [{ amount: "120.00" }],
    });
    expect(result.isNegative()).toBe(true);
    expect(result.toString()).toBe("-20");
  });

  it("treats a missing/empty total as zero", () => {
    const result = calculateOutstandingAmount({
      total: "",
      payments: [{ amount: "10.00" }],
    });
    expect(result.toString()).toBe("-10");
  });

  it("treats an empty payment amount as zero", () => {
    const result = calculateOutstandingAmount({
      total: "100.00",
      payments: [{ amount: "" }, { amount: "25.00" }],
    });
    expect(result.toString()).toBe("75");
  });

  it("preserves exact decimal precision (no floating-point drift)", () => {
    // 0.1 + 0.2 !== 0.3 in IEEE 754 — Decimal must get this exact.
    const result = calculateOutstandingAmount({
      total: "0.30",
      payments: [{ amount: "0.10" }, { amount: "0.20" }],
    });
    expect(result.isZero()).toBe(true);
  });

  it("handles many-Rappen amounts without rounding error", () => {
    const result = calculateOutstandingAmount({
      total: "1234.55",
      payments: [{ amount: "1000.05" }, { amount: "234.50" }],
    });
    expect(result.isZero()).toBe(true);
  });
});
