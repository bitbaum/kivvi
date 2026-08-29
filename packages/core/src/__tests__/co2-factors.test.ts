import { describe, it, expect } from "vitest";
import { ITEM_CATEGORIES } from "../config/checklist-templates";
import { CO2_FACTORS_KG, CO2_DEFAULT_KG, getCo2Factor } from "../config/co2-factors";

// ============================================================================
// SSOT invariant: CO2_FACTORS_KG must cover every ITEM_CATEGORY
// ============================================================================

describe("CO2_FACTORS_KG SSOT invariant", () => {
  it("every ITEM_CATEGORY has a CO2 factor entry", () => {
    for (const cat of ITEM_CATEGORIES) {
      expect(
        CO2_FACTORS_KG[cat],
        `Missing CO2 factor for category "${cat}". Add it to packages/core/src/config/co2-factors.ts.`,
      ).toBeDefined();
    }
  });

  it("CO2_FACTORS_KG contains no categories absent from ITEM_CATEGORIES", () => {
    const extraKeys = Object.keys(CO2_FACTORS_KG).filter((k) => !ITEM_CATEGORIES.includes(k));
    expect(
      extraKeys,
      `CO2_FACTORS_KG has keys not in ITEM_CATEGORIES: ${extraKeys.join(", ")}. Either add the category to checklist-templates.ts or remove it from co2-factors.ts.`,
    ).toHaveLength(0);
  });

  it("all CO2 factors are positive numbers", () => {
    for (const [cat, kg] of Object.entries(CO2_FACTORS_KG)) {
      expect(kg, `${cat}: CO2 factor must be positive`).toBeGreaterThan(0);
      expect(typeof kg, `${cat}: CO2 factor must be a number`).toBe("number");
    }
  });
});

// ============================================================================
// getCo2Factor — resolution logic
// ============================================================================

describe("getCo2Factor", () => {
  it("returns the factor for a known category", () => {
    expect(getCo2Factor("laptop")).toBe(300);
  });

  it("is case-insensitive", () => {
    expect(getCo2Factor("Laptop")).toBe(300);
    expect(getCo2Factor("LAPTOP")).toBe(300);
  });

  it("returns CO2_DEFAULT_KG for unknown category", () => {
    expect(getCo2Factor("unknown_gadget")).toBe(CO2_DEFAULT_KG);
  });

  it("returns CO2_DEFAULT_KG for null", () => {
    expect(getCo2Factor(null)).toBe(getCo2Factor("other"));
  });

  it("returns CO2_DEFAULT_KG for undefined", () => {
    expect(getCo2Factor(undefined)).toBe(getCo2Factor("other"));
  });

  it("company override takes precedence over default factor", () => {
    const overrides = { laptop: 250 };
    expect(getCo2Factor("laptop", overrides)).toBe(250);
  });

  it("falls back to default factor when override does not cover the category", () => {
    const overrides = { laptop: 250 };
    expect(getCo2Factor("monitor", overrides)).toBe(200);
  });

  it("override value of 0 is respected (not treated as falsy fallback)", () => {
    const overrides = { laptop: 0 };
    expect(getCo2Factor("laptop", overrides)).toBe(0);
  });
});
