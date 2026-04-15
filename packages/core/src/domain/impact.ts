/**
 * Impact Metrics — measure the environmental and social impact of reuse.
 *
 * For secondhand businesses, impact IS the point. These metrics power:
 * - Dashboard overview
 * - Annual reports (Vereinsbericht)
 * - Marketing ("Buy refurbished, save X kg CO2")
 * - Grant applications
 *
 * CO2 estimates are configurable per company via CompanySettings.co2FactorsKg.
 * Defaults based on lifecycle assessment research (Fraunhofer IZM 2019):
 * - Desktop computer: ~500 kg CO2 to manufacture new
 * - Laptop: ~300 kg CO2 to manufacture new
 * - Monitor: ~200 kg CO2 to manufacture new
 * - Phone/tablet: ~70 kg CO2
 * - Peripheral (keyboard/mouse): ~10 kg CO2
 * - Generic electronics / fallback: ~50 kg CO2
 * - Clothing: ~20 kg CO2 (Ellen MacArthur Foundation)
 * - Furniture: ~100 kg CO2
 */

import Decimal from "decimal.js";
import { eq, and, gte, lte, count, inArray } from "drizzle-orm";
import { inventoryItems } from "@kivvi/database";
import type { Database } from "@kivvi/database";

// Default CO2 savings per item when category is unknown (kg)
export const DEFAULT_CO2_PER_ITEM_KG = 50;

/** Per-category CO2 totals for breakdown views */
export interface Co2ByCategory {
  category: string;
  itemCount: number;
  co2KgFactor: number;
  co2TotalKg: string;
}

export interface ImpactMetrics {
  /** Items diverted from waste (sold or donated — given a second life) */
  itemsReused: number;
  /** Items sent to recycling */
  itemsRecycled: number;
  /** Total items ever processed */
  itemsProcessed: number;
  /** Estimated CO2 avoided (kg) — sum across all categories */
  co2AvoidedKg: string;
  /** Estimated waste diverted (items reused + recycled) */
  wasteDiverted: number;
  /** Reuse rate: items reused / total processed */
  reuseRatePercent: number;
  /** CO2 breakdown by item category (only categories with > 0 reused items) */
  co2ByCategory: Co2ByCategory[];
}

export async function getImpactMetrics(
  db: Database,
  companyId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    /** Per-category CO2 factors (kg). Falls back to DEFAULT_CO2_PER_ITEM_KG. */
    co2FactorsKg?: Record<string, number>;
  } = {},
): Promise<ImpactMetrics> {
  const conditions = [eq(inventoryItems.companyId, companyId)];
  if (options.startDate) {
    conditions.push(gte(inventoryItems.createdAt, options.startDate));
  }
  if (options.endDate) {
    conditions.push(lte(inventoryItems.createdAt, options.endDate));
  }

  const [reusedRows, recycledRows, totalRows] = await Promise.all([
    // Items that got a second life — grouped by category for CO2 breakdown
    db
      .select({ category: inventoryItems.category, count: count() })
      .from(inventoryItems)
      .where(
        and(...conditions, inArray(inventoryItems.status, ["sold", "donated"])),
      )
      .groupBy(inventoryItems.category),
    // Items recycled (total only — no CO2 credit for recycling)
    db
      .select({ count: count() })
      .from(inventoryItems)
      .where(and(...conditions, eq(inventoryItems.status, "recycled"))),
    // Total items ever processed
    db
      .select({ count: count() })
      .from(inventoryItems)
      .where(and(...conditions)),
  ]);

  const itemsRecycled = recycledRows[0]?.count || 0;
  const itemsProcessed = totalRows[0]?.count || 0;

  // Calculate CO2 avoided per category
  let totalCo2 = new Decimal(0);
  let totalReused = 0;
  const co2ByCategory: Co2ByCategory[] = [];

  for (const row of reusedRows) {
    const cat = row.category || "other";
    const itemCount = row.count;
    const factor = resolveCo2Factor(cat, options.co2FactorsKg);
    const co2Total = new Decimal(itemCount).times(factor);

    totalCo2 = totalCo2.plus(co2Total);
    totalReused += itemCount;

    co2ByCategory.push({
      category: cat,
      itemCount,
      co2KgFactor: factor,
      co2TotalKg: co2Total.toFixed(0),
    });
  }

  // Sort by CO2 contribution descending
  co2ByCategory.sort(
    (a, b) => Number(b.co2TotalKg) - Number(a.co2TotalKg),
  );

  const wasteDiverted = totalReused + itemsRecycled;
  const reuseRatePercent =
    itemsProcessed > 0 ? Math.round((totalReused / itemsProcessed) * 100) : 0;

  return {
    itemsReused: totalReused,
    itemsRecycled,
    itemsProcessed,
    co2AvoidedKg: totalCo2.toFixed(0),
    wasteDiverted,
    reuseRatePercent,
    co2ByCategory,
  };
}

/** Resolve CO2 factor for a category, with optional company overrides */
function resolveCo2Factor(
  category: string,
  overrides?: Record<string, number>,
): number {
  const cat = category.toLowerCase();
  if (overrides?.[cat] !== undefined) return overrides[cat];
  // Built-in defaults
  const defaults: Record<string, number> = {
    laptop: 300,
    desktop: 500,
    monitor: 200,
    phone: 70,
    tablet: 70,
    server: 800,
    printer: 150,
    keyboard: 10,
    mouse: 5,
    peripheral: 10,
    networking: 50,
    clothing: 20,
    furniture: 100,
    book: 2,
    toy: 5,
    bike: 80,
    electronics: 50,
    other: 50,
  };
  return defaults[cat] ?? DEFAULT_CO2_PER_ITEM_KG;
}
