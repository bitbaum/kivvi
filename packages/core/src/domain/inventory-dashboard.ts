/**
 * Inventory Business Dashboard — metrics that matter for secondhand businesses.
 *
 * Ground Truth #1: Software exists to serve humans.
 * These are the questions every secondhand business owner asks every day:
 * - Am I making money?
 * - What's my inventory worth?
 * - How fast am I selling?
 * - Where should I focus?
 */

import Decimal from "decimal.js";
import { eq, and, sql, gte, count, ne } from "drizzle-orm";
import { inventoryItems } from "@kivvi/database";
import type { Database } from "@kivvi/database";

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryDashboardData {
  /** Total inventory value (acquisition cost of unsold items) */
  inventoryValue: string;
  /** Count of unsold items */
  unsoldCount: number;
  /** Items by status */
  byStatus: Record<string, number>;
  /** Items by condition */
  byCondition: Record<string, number>;
  /** Average margin on sold items (percentage) */
  averageMarginPercent: number;
  /** Total profit from sold items */
  totalProfit: string;
  /** Number of items sold in the current period */
  soldCount: number;
  /** Number of items received in the current period */
  intakeCount: number;
  /** Average days from intake to sale */
  avgDaysToSale: number;
  /** Sell-through rate: % of items that were sold (vs recycled/donated) */
  sellThroughRate: number;
  /** Top margin items (best performers) */
  topItems: Array<{
    itemNumber: string;
    description: string;
    acquisitionCost: string;
    soldPrice: string;
    margin: string;
    marginPercent: number;
  }>;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export async function getInventoryDashboard(
  db: Database,
  companyId: string,
  options: { periodDays?: number } = {},
): Promise<InventoryDashboardData> {
  const periodDays = options.periodDays || 30;
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  // All queries in parallel for performance
  const [
    statusCounts,
    conditionCounts,
    unsoldValue,
    soldItems,
    periodIntake,
    periodSold,
    recentSalesWithMargin,
  ] = await Promise.all([
    // Count by status
    db
      .select({
        status: inventoryItems.status,
        count: count(),
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.companyId, companyId))
      .groupBy(inventoryItems.status),

    // Count by condition (unsold only)
    db
      .select({
        condition: inventoryItems.condition,
        count: count(),
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          ne(inventoryItems.status, "sold"),
          ne(inventoryItems.status, "recycled"),
          ne(inventoryItems.status, "donated"),
        ),
      )
      .groupBy(inventoryItems.condition),

    // Total value of unsold inventory (acquisition + repair costs = effective cost basis)
    db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(COALESCE(${inventoryItems.estimatedValue}, '0') AS DECIMAL) + CAST(COALESCE(${inventoryItems.repairCost}, '0') AS DECIMAL)), 0)`,
        count: count(),
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          ne(inventoryItems.status, "sold"),
          ne(inventoryItems.status, "recycled"),
          ne(inventoryItems.status, "donated"),
        ),
      ),

    // All sold items (for true margin calculation: includes repair cost)
    db
      .select({
        soldPrice: inventoryItems.soldPrice,
        estimatedValue: inventoryItems.estimatedValue,
        repairCost: inventoryItems.repairCost,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.status, "sold"),
        ),
      ),

    // Items received this period
    db
      .select({ count: count() })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          gte(inventoryItems.createdAt, periodStart),
        ),
      ),

    // Items sold this period
    db
      .select({ count: count() })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.status, "sold"),
          gte(inventoryItems.updatedAt, periodStart),
        ),
      ),

    // Top margin items (recent, with both prices and repair costs)
    db
      .select({
        itemNumber: inventoryItems.itemNumber,
        description: inventoryItems.description,
        estimatedValue: inventoryItems.estimatedValue,
        repairCost: inventoryItems.repairCost,
        soldPrice: inventoryItems.soldPrice,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.status, "sold"),
          sql`${inventoryItems.soldPrice} IS NOT NULL`,
        ),
      )
      .orderBy(sql`${inventoryItems.updatedAt} DESC`)
      .limit(10),
  ]);

  // Calculate margins
  let totalRevenue = new Decimal(0);
  let totalCost = new Decimal(0);
  let totalDaysToSale = 0;
  let itemsWithDays = 0;

  for (const item of soldItems) {
    if (item.soldPrice) {
      totalRevenue = totalRevenue.plus(new Decimal(item.soldPrice));
    }
    // True cost = acquisition + repairs
    if (item.estimatedValue) {
      totalCost = totalCost.plus(new Decimal(item.estimatedValue));
    }
    if (item.repairCost) {
      totalCost = totalCost.plus(new Decimal(item.repairCost));
    }
    // Days to sale
    if (item.createdAt && item.updatedAt) {
      const days = Math.floor(
        (item.updatedAt.getTime() - item.createdAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (days >= 0) {
        totalDaysToSale += days;
        itemsWithDays++;
      }
    }
  }

  const totalProfit = totalRevenue.minus(totalCost);
  const averageMarginPercent = totalRevenue.gt(0)
    ? totalProfit.div(totalRevenue).times(100).toDecimalPlaces(1).toNumber()
    : 0;
  const avgDaysToSale =
    itemsWithDays > 0 ? Math.round(totalDaysToSale / itemsWithDays) : 0;

  // Sell-through rate: sold / (sold + recycled + donated)
  const byStatusMap = Object.fromEntries(
    statusCounts.map((r) => [r.status, r.count]),
  );
  const terminalItems =
    (byStatusMap["sold"] || 0) +
    (byStatusMap["recycled"] || 0) +
    (byStatusMap["donated"] || 0);
  const sellThroughRate =
    terminalItems > 0
      ? Math.round(((byStatusMap["sold"] || 0) / terminalItems) * 100)
      : 0;

  // Top margin items — uses true cost (acquisition + repairs)
  const topItems = recentSalesWithMargin
    .filter((item) => item.soldPrice)
    .map((item) => {
      const sold = new Decimal(item.soldPrice || "0");
      const acquisition = new Decimal(item.estimatedValue || "0");
      const repairs = new Decimal(item.repairCost || "0");
      const trueCost = acquisition.plus(repairs);
      const margin = sold.minus(trueCost);
      const marginPercent = sold.gt(0)
        ? margin.div(sold).times(100).toDecimalPlaces(1).toNumber()
        : 100; // Donations have 100% margin
      return {
        itemNumber: item.itemNumber,
        description: item.description,
        acquisitionCost: trueCost.toFixed(2),
        soldPrice: sold.toFixed(2),
        margin: margin.toFixed(2),
        marginPercent,
      };
    })
    .sort((a, b) => new Decimal(b.margin).comparedTo(new Decimal(a.margin)));

  return {
    inventoryValue: unsoldValue[0]?.total || "0",
    unsoldCount: unsoldValue[0]?.count || 0,
    byStatus: byStatusMap,
    byCondition: Object.fromEntries(
      conditionCounts.map((r) => [r.condition, r.count]),
    ),
    averageMarginPercent,
    totalProfit: totalProfit.toFixed(2),
    soldCount: periodSold[0]?.count || 0,
    intakeCount: periodIntake[0]?.count || 0,
    avgDaysToSale,
    sellThroughRate,
    topItems,
  };
}
