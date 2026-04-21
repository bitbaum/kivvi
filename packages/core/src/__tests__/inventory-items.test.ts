import { describe, it, expect } from "vitest";
import { calculateEffectiveCost } from "../domain/inventory-items";
import { ITEM_STATUS_TRANSITIONS } from "../config/item-transitions";

// ============================================================================
// calculateEffectiveCost (pure function — no DB required)
// ============================================================================

describe("calculateEffectiveCost", () => {
  it("returns null when both values are absent", () => {
    expect(
      calculateEffectiveCost({ estimatedValue: null, repairCost: null }),
    ).toBeNull();
  });

  it("returns acquisition cost alone when no repairs", () => {
    const result = calculateEffectiveCost({
      estimatedValue: "60.00",
      repairCost: null,
    });
    expect(parseFloat(result!)).toBeCloseTo(60.0, 2);
  });

  it("returns repair cost alone when no acquisition value (donation)", () => {
    // CHF 0 acquisition + CHF 47 repairs = CHF 47 effective cost
    const result = calculateEffectiveCost({
      estimatedValue: null,
      repairCost: "47.00",
    });
    expect(parseFloat(result!)).toBeCloseTo(47.0, 2);
  });

  it("sums acquisition + repair cost", () => {
    // ThinkPad donated (CHF 0) + CHF 47 refurb cost = CHF 47
    const result = calculateEffectiveCost({
      estimatedValue: "0",
      repairCost: "47.00",
    });
    expect(parseFloat(result!)).toBeCloseTo(47.0, 2);
  });

  it("accumulates multiple repair entries correctly", () => {
    // Acquisition CHF 15 + repair CHF 25 (battery) + repair CHF 30 (keyboard) = CHF 70
    const result = calculateEffectiveCost({
      estimatedValue: "15.00",
      repairCost: "55.00",
    });
    expect(parseFloat(result!)).toBeCloseTo(70.0, 2);
  });

  it("rounds to 2 decimal places", () => {
    const result = calculateEffectiveCost({
      estimatedValue: "10.005",
      repairCost: "5.004",
    });
    expect(result).toBe("15.01");
  });

  it("handles string decimals from DB correctly", () => {
    // Drizzle returns numeric columns as strings
    const result = calculateEffectiveCost({
      estimatedValue: "200.00",
      repairCost: "35.50",
    });
    // Decimal.js may strip trailing zeros; compare as number
    expect(parseFloat(result!)).toBeCloseTo(235.5, 2);
  });
});

// ============================================================================
// ITEM_STATUS_TRANSITIONS (SSOT used by domain + UI)
// ============================================================================

describe("ITEM_STATUS_TRANSITIONS", () => {
  // Core lifecycle path
  it("intake can transition to testing", () => {
    expect(ITEM_STATUS_TRANSITIONS.intake).toContain("testing");
  });

  it("intake can fast-path to ready_for_sale (bulk Brockenhaus intake)", () => {
    expect(ITEM_STATUS_TRANSITIONS.intake).toContain("ready_for_sale");
  });

  it("testing can transition to repair", () => {
    expect(ITEM_STATUS_TRANSITIONS.testing).toContain("repair");
  });

  it("testing can transition to ready_for_sale", () => {
    expect(ITEM_STATUS_TRANSITIONS.testing).toContain("ready_for_sale");
  });

  // Critical quality gate: repair NEVER goes directly to sale
  it("repair cannot transition directly to ready_for_sale", () => {
    expect(ITEM_STATUS_TRANSITIONS.repair).not.toContain("ready_for_sale");
  });

  it("repair must return to testing first (re-verification required)", () => {
    expect(ITEM_STATUS_TRANSITIONS.repair).toContain("testing");
  });

  // Sales flow
  it("ready_for_sale can transition to listed", () => {
    expect(ITEM_STATUS_TRANSITIONS.ready_for_sale).toContain("listed");
  });

  it("ready_for_sale can transition to reserved", () => {
    expect(ITEM_STATUS_TRANSITIONS.ready_for_sale).toContain("reserved");
  });

  it("listed can transition to sold", () => {
    expect(ITEM_STATUS_TRANSITIONS.listed).toContain("sold");
  });

  it("reserved can transition to sold", () => {
    expect(ITEM_STATUS_TRANSITIONS.reserved).toContain("sold");
  });

  // Return flow
  it("sold can only transition to returned", () => {
    expect(ITEM_STATUS_TRANSITIONS.sold).toEqual(["returned"]);
  });

  it("returned can re-enter repair workflow", () => {
    expect(ITEM_STATUS_TRANSITIONS.returned).toContain("repair");
    expect(ITEM_STATUS_TRANSITIONS.returned).toContain("testing");
  });

  // Terminal states
  it("recycled has no valid transitions (terminal state)", () => {
    expect(ITEM_STATUS_TRANSITIONS.recycled).toHaveLength(0);
  });

  it("donated has no valid transitions (terminal state)", () => {
    expect(ITEM_STATUS_TRANSITIONS.donated).toHaveLength(0);
  });

  // End-of-life paths
  it("testing can route to parts_only", () => {
    expect(ITEM_STATUS_TRANSITIONS.testing).toContain("parts_only");
  });

  it("repair can route to parts_only (unrepairable)", () => {
    expect(ITEM_STATUS_TRANSITIONS.repair).toContain("parts_only");
  });

  it("parts_only can only transition to recycled", () => {
    expect(ITEM_STATUS_TRANSITIONS.parts_only).toEqual(["recycled"]);
  });
});

// ============================================================================
// Margin calculation scenarios (business logic verification)
// ============================================================================

describe("margin calculation scenarios", () => {
  it("donated laptop with low repair cost earns good margin", () => {
    // Donated ThinkPad, CHF 47 refurb, sells for CHF 140 → margin CHF 93
    const effectiveCost = calculateEffectiveCost({
      estimatedValue: null,
      repairCost: "47.00",
    });
    expect(parseFloat(effectiveCost!)).toBeCloseTo(47.0, 2);
    const margin = 140.0 - parseFloat(effectiveCost!);
    expect(margin).toBeCloseTo(93.0, 2);
  });

  it("high repair cost can flip a unit to negative margin", () => {
    // Item acquired for CHF 20, repairs cost CHF 140, sells for CHF 120 → margin -CHF 40
    const effectiveCost = calculateEffectiveCost({
      estimatedValue: "20.00",
      repairCost: "140.00",
    });
    expect(parseFloat(effectiveCost!)).toBeCloseTo(160.0, 2);
    const margin = 120.0 - parseFloat(effectiveCost!);
    expect(margin).toBeCloseTo(-40.0, 2);
  });

  it("zero repair cost does not inflate effective cost beyond acquisition", () => {
    const effectiveCost = calculateEffectiveCost({
      estimatedValue: "80.00",
      repairCost: "0.00",
    });
    expect(parseFloat(effectiveCost!)).toBeCloseTo(80.0, 2);
  });
});
