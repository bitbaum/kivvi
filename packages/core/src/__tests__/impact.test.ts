import { describe, it, expect } from "vitest";
import {
  calculateImpactMetrics,
  DEFAULT_CO2_PER_ITEM_KG,
} from "../domain/impact";
import { CO2_FACTORS_KG } from "../config/co2-factors";

// ============================================================================
// calculateImpactMetrics — pure kernel, no DB required
// ============================================================================

describe("calculateImpactMetrics — empty state", () => {
  it("returns all zeros when no items processed", () => {
    const result = calculateImpactMetrics([], 0, 0);
    expect(result.itemsReused).toBe(0);
    expect(result.itemsRecycled).toBe(0);
    expect(result.itemsProcessed).toBe(0);
    expect(result.co2AvoidedKg).toBe("0");
    expect(result.wasteDiverted).toBe(0);
    expect(result.reuseRatePercent).toBe(0);
    expect(result.co2ByCategory).toHaveLength(0);
  });

  it("reuseRatePercent is 0 (not NaN / divide-by-zero) when itemsProcessed is 0", () => {
    const result = calculateImpactMetrics([], 0, 0);
    expect(result.reuseRatePercent).toBe(0);
    expect(Number.isNaN(result.reuseRatePercent)).toBe(false);
  });
});

// ============================================================================
// CO2 calculations
// ============================================================================

describe("calculateImpactMetrics — CO2 calculation", () => {
  it("uses CO2_FACTORS_KG defaults for known categories", () => {
    const result = calculateImpactMetrics(
      [{ category: "laptop", count: 1 }],
      0,
      1,
    );
    expect(result.co2AvoidedKg).toBe(String(CO2_FACTORS_KG.laptop)); // 300
    expect(result.co2ByCategory[0].co2KgFactor).toBe(CO2_FACTORS_KG.laptop);
  });

  it("multiplies CO2 factor by item count", () => {
    // 5 laptops × 300 kg = 1500 kg
    const result = calculateImpactMetrics(
      [{ category: "laptop", count: 5 }],
      0,
      5,
    );
    expect(result.co2AvoidedKg).toBe("1500");
  });

  it("sums CO2 across multiple categories", () => {
    // 2 laptops × 300 = 600, 1 desktop × 500 = 500 → total 1100
    const result = calculateImpactMetrics(
      [
        { category: "laptop", count: 2 },
        { category: "desktop", count: 1 },
      ],
      0,
      3,
    );
    expect(result.co2AvoidedKg).toBe("1100");
  });

  it("uses DEFAULT_CO2_PER_ITEM_KG for unknown categories", () => {
    const result = calculateImpactMetrics(
      [{ category: "unicycle", count: 1 }],
      0,
      1,
    );
    expect(result.co2AvoidedKg).toBe(String(DEFAULT_CO2_PER_ITEM_KG));
  });

  it("treats null category as 'other'", () => {
    const result = calculateImpactMetrics([{ category: null, count: 1 }], 0, 1);
    expect(result.co2ByCategory[0].category).toBe("other");
    expect(result.co2AvoidedKg).toBe(String(CO2_FACTORS_KG.other));
  });

  it("company override replaces default factor", () => {
    // Company override: laptop = 250 (instead of default 300)
    const result = calculateImpactMetrics(
      [{ category: "laptop", count: 2 }],
      0,
      2,
      { laptop: 250 },
    );
    expect(result.co2AvoidedKg).toBe("500");
    expect(result.co2ByCategory[0].co2KgFactor).toBe(250);
  });

  it("company override of 0 is respected (not silently ignored)", () => {
    const result = calculateImpactMetrics(
      [{ category: "laptop", count: 3 }],
      0,
      3,
      { laptop: 0 },
    );
    expect(result.co2AvoidedKg).toBe("0");
  });
});

// ============================================================================
// itemsReused, itemsRecycled, wasteDiverted
// ============================================================================

describe("calculateImpactMetrics — counts", () => {
  it("sums itemsReused across all reused categories", () => {
    const result = calculateImpactMetrics(
      [
        { category: "laptop", count: 3 },
        { category: "monitor", count: 2 },
      ],
      0,
      5,
    );
    expect(result.itemsReused).toBe(5);
  });

  it("wasteDiverted = itemsReused + itemsRecycled", () => {
    // 4 sold + 2 donated = 6 reused (via two DB rows), 3 recycled
    const result = calculateImpactMetrics(
      [
        { category: "laptop", count: 4 },
        { category: "clothing", count: 2 },
      ],
      3,
      12,
    );
    expect(result.itemsReused).toBe(6);
    expect(result.itemsRecycled).toBe(3);
    expect(result.wasteDiverted).toBe(9);
  });

  it("recycled items are NOT counted in itemsReused", () => {
    const result = calculateImpactMetrics([], 5, 5);
    expect(result.itemsReused).toBe(0);
    expect(result.itemsRecycled).toBe(5);
  });

  it("recycled items do NOT contribute to CO2 avoided", () => {
    // Recycling doesn't credit CO2 avoided vs buying new
    const result = calculateImpactMetrics([], 10, 10);
    expect(result.co2AvoidedKg).toBe("0");
  });
});

// ============================================================================
// reuseRatePercent
// ============================================================================

describe("calculateImpactMetrics — reuseRatePercent", () => {
  it("100% when all items were reused", () => {
    const result = calculateImpactMetrics(
      [{ category: "laptop", count: 10 }],
      0,
      10,
    );
    expect(result.reuseRatePercent).toBe(100);
  });

  it("50% when half of items were reused", () => {
    const result = calculateImpactMetrics(
      [{ category: "laptop", count: 5 }],
      0,
      10,
    );
    expect(result.reuseRatePercent).toBe(50);
  });

  it("rounds to nearest integer", () => {
    // 1 reused out of 3 = 33.33% → rounds to 33
    const result = calculateImpactMetrics(
      [{ category: "laptop", count: 1 }],
      0,
      3,
    );
    expect(result.reuseRatePercent).toBe(33);
  });

  it("0% when items exist but none were reused", () => {
    const result = calculateImpactMetrics([], 0, 10);
    expect(result.reuseRatePercent).toBe(0);
  });

  it("reuse rate is based on processed, not (reused + recycled)", () => {
    // 5 reused, 3 recycled, 15 total processed → 33%
    const result = calculateImpactMetrics(
      [{ category: "laptop", count: 5 }],
      3,
      15,
    );
    expect(result.reuseRatePercent).toBe(33);
  });
});

// ============================================================================
// co2ByCategory — breakdown and sorting
// ============================================================================

describe("calculateImpactMetrics — co2ByCategory", () => {
  it("sorted by CO2 contribution descending", () => {
    // laptop (2×300=600) > monitor (5×200=1000)? No: monitor wins
    const result = calculateImpactMetrics(
      [
        { category: "laptop", count: 2 }, // 600 kg
        { category: "monitor", count: 5 }, // 1000 kg
        { category: "book", count: 50 }, // 100 kg
      ],
      0,
      57,
    );
    expect(result.co2ByCategory[0].category).toBe("monitor"); // 1000
    expect(result.co2ByCategory[1].category).toBe("laptop"); // 600
    expect(result.co2ByCategory[2].category).toBe("book"); // 100
  });

  it("each entry has correct itemCount, factor, and total", () => {
    const result = calculateImpactMetrics(
      [{ category: "bike", count: 3 }],
      0,
      3,
    );
    const entry = result.co2ByCategory[0];
    expect(entry.category).toBe("bike");
    expect(entry.itemCount).toBe(3);
    expect(entry.co2KgFactor).toBe(CO2_FACTORS_KG.bike); // 80
    expect(entry.co2TotalKg).toBe("240");
  });

  it("co2TotalKg is rounded to integer string (no decimals)", () => {
    // appliance (100 kg) × 1 = 100 — now that appliance is in CO2_FACTORS_KG
    const result = calculateImpactMetrics(
      [{ category: "appliance", count: 1 }],
      0,
      1,
    );
    expect(result.co2ByCategory[0].co2TotalKg).toBe("100");
    expect(result.co2ByCategory[0].co2TotalKg).not.toContain(".");
  });

  it("category with null is shown as 'other' in breakdown", () => {
    const result = calculateImpactMetrics([{ category: null, count: 2 }], 0, 2);
    expect(result.co2ByCategory[0].category).toBe("other");
  });
});

// ============================================================================
// appliance regression — the bug that prompted this test suite
// ============================================================================

describe("appliance CO2 regression", () => {
  it("appliance items contribute CO2 to the total (was silently 0 before fix)", () => {
    const result = calculateImpactMetrics(
      [{ category: "appliance", count: 5 }],
      0,
      5,
    );
    // 5 × 100 kg = 500 kg — would have been DEFAULT (50 kg) × 5 = 250 before
    expect(result.co2AvoidedKg).toBe("500");
    expect(result.co2ByCategory[0].co2KgFactor).toBe(100);
  });
});
