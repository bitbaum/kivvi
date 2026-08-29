import { describe, it, expect } from "vitest";
import { applyPriceRule, createPriceListSchema, createPriceRuleSchema } from "../domain/pricing";

// ============================================================================
// applyPriceRule — pure calculation, no DB required
// ============================================================================

describe("applyPriceRule — fixed", () => {
  it("returns the rule value directly", () => {
    const result = applyPriceRule({ type: "fixed", value: "79.00" }, "100.00");
    expect(result).toEqual({ price: "79.00", ruleType: "fixed" });
  });

  it("ignores base price for fixed rules", () => {
    const result = applyPriceRule({ type: "fixed", value: "49.90" }, "999.00");
    expect(result?.price).toBe("49.90");
  });
});

describe("applyPriceRule — percentage discount", () => {
  it("applies 10% discount to base price", () => {
    // CHF 100 - 10% = CHF 90
    const result = applyPriceRule({ type: "percentage", value: "10" }, "100.00");
    expect(result).toEqual({ price: "90.00", ruleType: "percentage" });
  });

  it("applies 25% discount correctly", () => {
    // CHF 80 - 25% = CHF 60
    const result = applyPriceRule({ type: "percentage", value: "25" }, "80.00");
    expect(result).toEqual({ price: "60.00", ruleType: "percentage" });
  });

  it("rounds to 2 decimal places", () => {
    // CHF 99.99 - 15% = CHF 84.9915 → rounds to CHF 84.99
    const result = applyPriceRule({ type: "percentage", value: "15" }, "99.99");
    expect(result?.price).toBe("84.99");
  });

  it("100% discount produces CHF 0.00", () => {
    const result = applyPriceRule({ type: "percentage", value: "100" }, "150.00");
    expect(result?.price).toBe("0.00");
  });

  it("0% discount returns original price", () => {
    const result = applyPriceRule({ type: "percentage", value: "0" }, "55.00");
    expect(result?.price).toBe("55.00");
  });
});

describe("applyPriceRule — tiered", () => {
  it("applies discount when quantity meets threshold", () => {
    // Buy 10+: 20% off CHF 50 = CHF 40
    const result = applyPriceRule({ type: "tiered", value: "20", minQuantity: "10" }, "50.00", 10);
    expect(result).toEqual({ price: "40.00", ruleType: "tiered" });
  });

  it("returns null when quantity is below threshold", () => {
    const result = applyPriceRule({ type: "tiered", value: "20", minQuantity: "10" }, "50.00", 9);
    expect(result).toBeNull();
  });

  it("applies discount when quantity exactly meets threshold", () => {
    const result = applyPriceRule({ type: "tiered", value: "15", minQuantity: "5" }, "100.00", 5);
    expect(result).not.toBeNull();
    expect(result?.price).toBe("85.00");
  });

  it("applies discount when quantity exceeds threshold", () => {
    const result = applyPriceRule({ type: "tiered", value: "15", minQuantity: "5" }, "100.00", 50);
    expect(result?.price).toBe("85.00");
  });

  it("applies discount when no quantity provided (threshold irrelevant)", () => {
    // No quantity = no threshold check → discount applies
    const result = applyPriceRule({ type: "tiered", value: "10", minQuantity: "100" }, "200.00");
    expect(result?.price).toBe("180.00");
  });

  it("applies discount when minQuantity is null", () => {
    const result = applyPriceRule({ type: "tiered", value: "10", minQuantity: null }, "200.00", 1);
    expect(result?.price).toBe("180.00");
  });
});

// ============================================================================
// createPriceListSchema
// ============================================================================

describe("createPriceListSchema", () => {
  it("accepts minimal valid input", () => {
    const result = createPriceListSchema.safeParse({ name: "Brockenhaus" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("CHF");
      expect(result.data.isDefault).toBe(false);
    }
  });

  it("rejects empty name", () => {
    const result = createPriceListSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts custom currency", () => {
    const result = createPriceListSchema.safeParse({
      name: "EU list",
      currency: "EUR",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe("EUR");
  });
});

// ============================================================================
// createPriceRuleSchema
// ============================================================================

describe("createPriceRuleSchema", () => {
  it("accepts valid fixed rule", () => {
    const result = createPriceRuleSchema.safeParse({
      type: "fixed",
      value: "49.90",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid percentage rule", () => {
    const result = createPriceRuleSchema.safeParse({
      type: "percentage",
      value: "15.00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects value with more than 2 decimal places", () => {
    const result = createPriceRuleSchema.safeParse({
      type: "fixed",
      value: "10.999",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric value", () => {
    const result = createPriceRuleSchema.safeParse({
      type: "fixed",
      value: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("accepts date-range fields", () => {
    const result = createPriceRuleSchema.safeParse({
      type: "percentage",
      value: "10",
      validFrom: "2024-01-01",
      validTo: "2024-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = createPriceRuleSchema.safeParse({
      type: "fixed",
      value: "50",
      validFrom: "01.01.2024",
    });
    expect(result.success).toBe(false);
  });
});
