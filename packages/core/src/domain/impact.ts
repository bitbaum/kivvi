/**
 * Impact Metrics — measure the environmental and social impact of reuse.
 *
 * For secondhand businesses, impact IS the point. These metrics power:
 * - Dashboard overview
 * - Annual reports (Vereinsbericht)
 * - Marketing ("Buy refurbished, save X kg CO2")
 * - Grant applications
 *
 * CO2 estimates are configurable per company. Defaults based on industry research:
 * - Desktop computer: ~500 kg CO2 to manufacture new
 * - Laptop: ~300 kg CO2 to manufacture new
 * - Monitor: ~200 kg CO2 to manufacture new
 * - Peripheral (keyboard/mouse): ~10 kg CO2
 * - Generic electronics: ~50 kg CO2
 * - Furniture: ~100 kg CO2
 * - Clothing: ~20 kg CO2
 * - Average secondhand item: ~50 kg CO2 saved by reuse vs new manufacture
 */

import Decimal from "decimal.js";
import { eq, and, gte, lte, count, inArray } from "drizzle-orm";
import { inventoryItems } from "@kivvi/database";
import type { Database } from "@kivvi/database";

// Default CO2 savings per item (kg) — conservative estimates
const DEFAULT_CO2_PER_ITEM_KG = 50;

export interface ImpactMetrics {
  /** Items diverted from waste (sold or donated — given a second life) */
  itemsReused: number;
  /** Items sent to recycling */
  itemsRecycled: number;
  /** Total items processed */
  itemsProcessed: number;
  /** Estimated CO2 avoided (kg) — reused items × factor */
  co2AvoidedKg: string;
  /** Estimated waste diverted (items reused + recycled) */
  wasteDiverted: number;
  /** Reuse rate: items reused / total processed */
  reuseRatePercent: number;
}

export async function getImpactMetrics(
  db: Database,
  companyId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    co2PerItemKg?: number;
  } = {},
): Promise<ImpactMetrics> {
  const co2Factor = options.co2PerItemKg || DEFAULT_CO2_PER_ITEM_KG;

  const conditions = [eq(inventoryItems.companyId, companyId)];
  if (options.startDate) {
    conditions.push(gte(inventoryItems.createdAt, options.startDate));
  }
  if (options.endDate) {
    conditions.push(lte(inventoryItems.createdAt, options.endDate));
  }

  const [reused, recycled, total] = await Promise.all([
    // Items that got a second life (sold or donated)
    db
      .select({ count: count() })
      .from(inventoryItems)
      .where(
        and(...conditions, inArray(inventoryItems.status, ["sold", "donated"])),
      ),
    // Items recycled
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

  const itemsReused = reused[0]?.count || 0;
  const itemsRecycled = recycled[0]?.count || 0;
  const itemsProcessed = total[0]?.count || 0;

  const co2Avoided = new Decimal(itemsReused).times(co2Factor);
  const wasteDiverted = itemsReused + itemsRecycled;
  const reuseRatePercent =
    itemsProcessed > 0 ? Math.round((itemsReused / itemsProcessed) * 100) : 0;

  return {
    itemsReused,
    itemsRecycled,
    itemsProcessed,
    co2AvoidedKg: co2Avoided.toFixed(0),
    wasteDiverted,
    reuseRatePercent,
  };
}
