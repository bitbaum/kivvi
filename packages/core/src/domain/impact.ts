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
import { eq, and, gte, lte, count, inArray, sql, isNotNull } from "drizzle-orm";
import { inventoryItems, contacts, documents } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { getCo2Factor, CO2_DEFAULT_KG } from "../config/co2-factors";
import { PIPELINE_ITEM_STATUSES, DISPOSED_ITEM_STATUSES } from "../config/item-status-sets";

// Default CO2 savings per item when category is unknown (kg)
// Re-exported from co2-factors SSOT so callers don't need to import from two places.
export const DEFAULT_CO2_PER_ITEM_KG = CO2_DEFAULT_KG;

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

/**
 * Pure calculation kernel — converts raw DB row counts into ImpactMetrics.
 * Extracted so it can be unit-tested without a database.
 *
 * @param reusedRows   Rows from a GROUP BY category query for sold/donated items
 * @param itemsRecycled  Count of items with status "recycled"
 * @param itemsProcessed Count of all items ever processed
 * @param co2FactorsKg  Optional company-specific CO2 overrides
 */
export function calculateImpactMetrics(
  reusedRows: { category: string | null; count: number }[],
  itemsRecycled: number,
  itemsProcessed: number,
  co2FactorsKg?: Record<string, number>,
): ImpactMetrics {
  let totalCo2 = new Decimal(0);
  let totalReused = 0;
  const co2ByCategory: Co2ByCategory[] = [];

  for (const row of reusedRows) {
    const cat = row.category || "other";
    const itemCount = row.count;
    const factor = getCo2Factor(cat, co2FactorsKg);
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

  // Sort by CO2 contribution descending (highest impact first)
  co2ByCategory.sort((a, b) => Number(b.co2TotalKg) - Number(a.co2TotalKg));

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

export async function getImpactMetrics(
  db: Database,
  companyId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    /** Filter to items donated by a specific contact */
    donorContactId?: string;
    /** Per-category CO2 factors (kg). Falls back to CO2_FACTORS_KG defaults. */
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
  if (options.donorContactId) {
    conditions.push(eq(inventoryItems.donorContactId, options.donorContactId));
  }

  const [reusedRows, recycledRows, totalRows] = await Promise.all([
    // Items that got a second life — grouped by category for CO2 breakdown
    db
      .select({ category: inventoryItems.category, count: count() })
      .from(inventoryItems)
      .where(and(...conditions, inArray(inventoryItems.status, [...DISPOSED_ITEM_STATUSES])))
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

  return calculateImpactMetrics(
    reusedRows,
    recycledRows[0]?.count || 0,
    totalRows[0]?.count || 0,
    options.co2FactorsKg,
  );
}

// ============================================================================
// MONTHLY BREAKDOWN
// ============================================================================

export interface MonthlyBreakdown {
  /** "2026-01" format */
  month: string;
  processed: number;
  reused: number;
  reuseRatePercent: number;
}

export async function getMonthlyBreakdown(
  db: Database,
  companyId: string,
  options: { startDate?: Date; endDate?: Date } = {},
): Promise<MonthlyBreakdown[]> {
  const conditions = [eq(inventoryItems.companyId, companyId)];
  if (options.startDate) conditions.push(gte(inventoryItems.createdAt, options.startDate));
  if (options.endDate) conditions.push(lte(inventoryItems.createdAt, options.endDate));

  const [processedRows, reusedRows] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(${inventoryItems.createdAt}, 'YYYY-MM')`,
        count: count(),
      })
      .from(inventoryItems)
      .where(and(...conditions))
      .groupBy(sql`to_char(${inventoryItems.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${inventoryItems.createdAt}, 'YYYY-MM')`),
    db
      .select({
        month: sql<string>`to_char(${inventoryItems.createdAt}, 'YYYY-MM')`,
        count: count(),
      })
      .from(inventoryItems)
      .where(and(...conditions, inArray(inventoryItems.status, [...DISPOSED_ITEM_STATUSES])))
      .groupBy(sql`to_char(${inventoryItems.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${inventoryItems.createdAt}, 'YYYY-MM')`),
  ]);

  const reusedByMonth = new Map(reusedRows.map((r) => [r.month, r.count]));

  return processedRows.map((r) => {
    const reused = reusedByMonth.get(r.month) || 0;
    return {
      month: r.month,
      processed: r.count,
      reused,
      reuseRatePercent: r.count > 0 ? Math.round((reused / r.count) * 100) : 0,
    };
  });
}

// ============================================================================
// TOP DONORS
// ============================================================================

export interface TopDonor {
  donorId: string;
  donorName: string;
  itemsDonated: number;
  itemsReused: number;
}

export async function getTopDonors(
  db: Database,
  companyId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    anonymize?: boolean;
  } = {},
): Promise<TopDonor[]> {
  const limit = options.limit ?? 5;
  const conditions = [
    eq(inventoryItems.companyId, companyId),
    sql`${inventoryItems.donorContactId} IS NOT NULL`,
  ];
  if (options.startDate) conditions.push(gte(inventoryItems.createdAt, options.startDate));
  if (options.endDate) conditions.push(lte(inventoryItems.createdAt, options.endDate));

  const [donatedRows, reusedRows] = await Promise.all([
    db
      .select({
        donorContactId: inventoryItems.donorContactId,
        donorName: contacts.name,
        count: count(),
      })
      .from(inventoryItems)
      .leftJoin(contacts, eq(inventoryItems.donorContactId, contacts.id))
      .where(and(...conditions))
      .groupBy(inventoryItems.donorContactId, contacts.name)
      .orderBy(sql`count(*) DESC`)
      .limit(limit),
    db
      .select({
        donorContactId: inventoryItems.donorContactId,
        count: count(),
      })
      .from(inventoryItems)
      .where(and(...conditions, inArray(inventoryItems.status, [...DISPOSED_ITEM_STATUSES])))
      .groupBy(inventoryItems.donorContactId),
  ]);

  const reusedByDonor = new Map(reusedRows.map((r) => [r.donorContactId, r.count]));

  return donatedRows.map((r, i) => ({
    donorId: r.donorContactId!,
    donorName: options.anonymize ? `Spender ${i + 1}` : r.donorName || "Unbekannt",
    itemsDonated: r.count,
    itemsReused: reusedByDonor.get(r.donorContactId) || 0,
  }));
}

// ============================================================================
// DESTINATION BREAKDOWN
// ============================================================================

export interface DestinationBreakdown {
  sold: number;
  donated: number;
  recycled: number;
  inStock: number;
}

export async function getDestinationBreakdown(
  db: Database,
  companyId: string,
  options: { startDate?: Date; endDate?: Date } = {},
): Promise<DestinationBreakdown> {
  const conditions = [eq(inventoryItems.companyId, companyId)];
  if (options.startDate) conditions.push(gte(inventoryItems.createdAt, options.startDate));
  if (options.endDate) conditions.push(lte(inventoryItems.createdAt, options.endDate));

  const rows = await db
    .select({ status: inventoryItems.status, count: count() })
    .from(inventoryItems)
    .where(and(...conditions))
    .groupBy(inventoryItems.status);

  const byStatus = new Map(rows.map((r) => [r.status, r.count]));

  const inStock = PIPELINE_ITEM_STATUSES.reduce(
    (sum, s) => sum + (byStatus.get(s as never) || 0),
    0,
  );

  return {
    sold: byStatus.get("sold") || 0,
    donated: byStatus.get("donated") || 0,
    recycled: byStatus.get("recycled") || 0,
    inStock,
  };
}

/** Average cycle time from item intake to final disposition */
export interface CycleTimeMetrics {
  avgDaysToSell: number | null;
  avgDaysToDonate: number | null;
  avgDaysAll: number | null;
  sampleSize: number;
}

/**
 * Computes average days from item creation (intake) to disposition.
 * Uses saleDocumentId → documents.issueDate for sold items.
 * Donated/recycled items without a sale document use updatedAt as proxy.
 */
export async function getCycleTimeMetrics(
  db: Database,
  companyId: string,
): Promise<CycleTimeMetrics> {
  // For sold items: use the sale document's issue date
  const soldRows = await db
    .select({
      days: sql<number>`EXTRACT(EPOCH FROM (${documents.issueDate}::timestamp - ${inventoryItems.createdAt})) / 86400`,
    })
    .from(inventoryItems)
    .innerJoin(documents, eq(inventoryItems.saleDocumentId, documents.id))
    .where(
      and(
        eq(inventoryItems.companyId, companyId),
        eq(inventoryItems.status, "sold"),
        isNotNull(inventoryItems.saleDocumentId),
        isNotNull(documents.issueDate),
      ),
    );

  // For donated items without a sale document: use updatedAt as best proxy
  const donatedRows = await db
    .select({
      days: sql<number>`EXTRACT(EPOCH FROM (${inventoryItems.updatedAt} - ${inventoryItems.createdAt})) / 86400`,
    })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.companyId, companyId), eq(inventoryItems.status, "donated")));

  const soldDays = soldRows.map((r) => Number(r.days)).filter((d) => d >= 0 && d < 3650);
  const donatedDays = donatedRows.map((r) => Number(r.days)).filter((d) => d >= 0 && d < 3650);
  const allDays = [...soldDays, ...donatedDays];

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  return {
    avgDaysToSell: avg(soldDays),
    avgDaysToDonate: avg(donatedDays),
    avgDaysAll: avg(allDays),
    sampleSize: allDays.length,
  };
}

/** Current dwell time per pipeline status — how long items have been sitting in each stage */
export interface StatusDwellEntry {
  status: string;
  count: number;
  avgDays: number;
  maxDays: number;
}

/**
 * Returns average and max days currently-active pipeline items have been in their
 * current status. Uses statusUpdatedAt (stamped on every status transition).
 * Only includes PIPELINE statuses (intake/testing/repair/ready_for_sale/listed/reserved).
 */
export async function getStatusDwellMetrics(
  db: Database,
  companyId: string,
): Promise<StatusDwellEntry[]> {
  const rows = await db
    .select({
      status: inventoryItems.status,
      count: count(),
      avgDays: sql<number>`ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - ${inventoryItems.statusUpdatedAt})) / 86400))`,
      maxDays: sql<number>`ROUND(MAX(EXTRACT(EPOCH FROM (NOW() - ${inventoryItems.statusUpdatedAt})) / 86400))`,
    })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.companyId, companyId),
        inArray(inventoryItems.status, [...PIPELINE_ITEM_STATUSES]),
      ),
    )
    .groupBy(inventoryItems.status);

  // Order by pipeline stage
  const order = [...PIPELINE_ITEM_STATUSES];
  return rows
    .map((r) => ({
      status: r.status,
      count: r.count,
      avgDays: Number(r.avgDays),
      maxDays: Number(r.maxDays),
    }))
    .sort((a, b) => order.indexOf(a.status as never) - order.indexOf(b.status as never));
}
