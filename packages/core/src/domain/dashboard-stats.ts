import Decimal from "decimal.js";
import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";
import { documents, contacts, products, bankAccounts } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { getFinancialSummary } from "./documents";

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardStat {
  labelKey: string;
  value: number;
  count?: number;
  linkTo: string;
  changePercent?: number; // Optional: percent change vs previous period
  type: "currency" | "count"; // Determines display format
}

export interface BusinessHealthMetrics {
  profitMargin: number; // Percentage
  conversionRate: number; // Percentage (orders/quotes * 100)
  avgInvoiceValue: number; // CHF
  avgDaysToPayment: number; // Days
  cashFlowRatio: number; // Percentage (inflow/outflow * 100)
  customerRetentionRate: number; // Percentage
}

export interface ExecutiveSummaryHighlight {
  key: string;
  params: Record<string, string | number>;
}

export interface ExecutiveSummary {
  highlights: ExecutiveSummaryHighlight[];
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * Get enhanced dashboard statistics with links.
 * Delegates core financial metrics to getFinancialSummary() (SSOT)
 * and adds dashboard-specific extras (bank balance, contact/product counts, MoM comparisons).
 */
export async function getDashboardStats(
  db: Database,
  companyId: string,
  sinceDate?: Date,
): Promise<{
  revenueThisMonth: DashboardStat;
  revenueThisYear: DashboardStat;
  outstandingInvoices: DashboardStat;
  overdueInvoices: DashboardStat;
  draftDocuments: DashboardStat;
  bankBalance: DashboardStat;
  activeContacts: DashboardStat;
  activeProducts: DashboardStat;
}> {
  const now = new Date();

  // Last month date range for month-over-month comparison
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month

  // Financial metrics from SSOT + dashboard-only queries in parallel
  const [
    financials,
    [bankBalance],
    [contactCount],
    [productCount],
    [lastMonthRevenue],
    [lastMonthOutstanding],
  ] = await Promise.all([
    getFinancialSummary(db, companyId, sinceDate),
    db
      .select({
        total: sql<string>`COALESCE(SUM(${bankAccounts.balance}::numeric), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(bankAccounts)
      .where(eq(bankAccounts.companyId, companyId)),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(contacts)
      .where(
        and(eq(contacts.companyId, companyId), eq(contacts.isActive, true)),
      ),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(products)
      .where(
        and(eq(products.companyId, companyId), eq(products.isActive, true)),
      ),
    // Last month's revenue for comparison
    db
      .select({
        total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "invoice"),
          eq(documents.status, "paid"),
          gte(documents.paidDate, startOfLastMonth),
          lte(documents.paidDate, endOfLastMonth),
        ),
      ),
    // Last month's outstanding for comparison (snapshot approximation)
    db
      .select({
        total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "invoice"),
          inArray(documents.status, [
            "sent",
            "confirmed",
            "delivered",
            "partially_paid",
          ]),
          lte(documents.issueDate, endOfLastMonth),
        ),
      ),
  ]);

  // Calculate month-over-month change percentages
  const lastMonthRev = new Decimal(lastMonthRevenue?.total || "0");
  const revenueChange = lastMonthRev.gt(0)
    ? new Decimal(financials.revenueThisMonth)
        .minus(lastMonthRev)
        .div(lastMonthRev)
        .times(100)
        .toNumber()
    : undefined;

  const lastOutstanding = new Decimal(lastMonthOutstanding?.total || "0");
  const outstandingChange = lastOutstanding.gt(0)
    ? new Decimal(financials.outstandingTotal)
        .minus(lastOutstanding)
        .div(lastOutstanding)
        .times(100)
        .toNumber()
    : undefined;

  return {
    revenueThisMonth: {
      labelKey: "stats.revenueThisMonth",
      value: financials.revenueThisMonth,
      count: financials.revenueThisMonthCount,
      linkTo: "/sales/invoices?status=paid",
      changePercent:
        revenueChange !== undefined
          ? Math.round(revenueChange * 10) / 10
          : undefined,
      type: "currency",
    },
    revenueThisYear: {
      labelKey: "stats.revenueThisYear",
      value: financials.revenueThisYear,
      count: 0,
      linkTo: "/reports/sales",
      type: "currency",
    },
    outstandingInvoices: {
      labelKey: "stats.outstandingInvoices",
      value: financials.outstandingTotal,
      count: financials.outstandingCount,
      linkTo: "/sales/invoices?status=sent,confirmed,delivered,partially_paid",
      changePercent:
        outstandingChange !== undefined
          ? Math.round(outstandingChange * 10) / 10
          : undefined,
      type: "currency",
    },
    overdueInvoices: {
      labelKey: "stats.overdueInvoices",
      value: financials.overdueTotal,
      count: financials.overdueCount,
      linkTo: "/sales/invoices?status=overdue",
      type: "currency",
    },
    draftDocuments: {
      labelKey: "stats.draftDocuments",
      value: financials.draftsTotal,
      count: financials.draftsCount,
      linkTo: "/sales?status=draft",
      type: "currency",
    },
    bankBalance: {
      labelKey: "stats.bankBalance",
      value: new Decimal(bankBalance?.total || "0").toNumber(),
      count: bankBalance?.count || 0,
      linkTo: "/banking",
      type: "currency",
    },
    activeContacts: {
      labelKey: "stats.activeContacts",
      value: contactCount?.count || 0,
      linkTo: "/contacts",
      type: "count",
    },
    activeProducts: {
      labelKey: "stats.activeProducts",
      value: productCount?.count || 0,
      linkTo: "/products",
      type: "count",
    },
  };
}

// ============================================================================
// BUSINESS HEALTH METRICS
// ============================================================================

/**
 * Calculate business health metrics for dashboard
 * Returns key performance indicators
 */
export async function getBusinessHealthMetrics(
  db: Database,
  companyId: string,
): Promise<BusinessHealthMetrics> {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
  const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);

  // Run all 5 independent queries in parallel
  const [
    [revenueData],
    [costsData],
    [conversionData],
    [paymentData],
    [lastYearData],
    [thisYearData],
  ] = await Promise.all([
    db
      .select({
        revenue: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "invoice"),
          eq(documents.status, "paid"),
          gte(documents.paidDate, startOfYear),
        ),
      ),
    db
      .select({
        costs: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "purchase_invoice"),
          eq(documents.status, "paid"),
          gte(documents.paidDate, startOfYear),
        ),
      ),
    db
      .select({
        quotes: sql<number>`COUNT(*) FILTER (WHERE ${documents.type} = 'quote' AND ${documents.status} != 'draft')::int`,
        orders: sql<number>`COUNT(*) FILTER (WHERE ${documents.type} = 'order')::int`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          gte(documents.issueDate, startOfYear),
        ),
      ),
    db
      .select({
        avgDays: sql<number>`AVG(EXTRACT(DAY FROM (${documents.paidDate}::timestamp - ${documents.issueDate}::timestamp)))::int`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, "invoice"),
          eq(documents.status, "paid"),
          gte(documents.paidDate, startOfYear),
          sql`${documents.paidDate} IS NOT NULL AND ${documents.issueDate} IS NOT NULL`,
        ),
      ),
    db
      .select({
        count: sql<number>`COUNT(DISTINCT ${documents.contactId})::int`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          gte(documents.issueDate, startOfLastYear),
          lte(documents.issueDate, endOfLastYear),
          sql`${documents.contactId} IS NOT NULL`,
        ),
      ),
    db
      .select({
        count: sql<number>`COUNT(DISTINCT ${documents.contactId})::int`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          gte(documents.issueDate, startOfYear),
          sql`${documents.contactId} IS NOT NULL`,
        ),
      ),
  ]);

  const revenue = new Decimal(revenueData?.revenue || "0");
  const costs = new Decimal(costsData?.costs || "0");
  const profitMargin = revenue.gt(0)
    ? revenue.minus(costs).div(revenue).times(100).toNumber()
    : 0;

  const quotes = conversionData?.quotes || 0;
  const orders = conversionData?.orders || 0;
  const conversionRate =
    quotes > 0 ? new Decimal(orders).div(quotes).times(100).toNumber() : 0;

  const avgInvoiceValue =
    revenueData && revenueData.count > 0
      ? revenue.div(revenueData.count).toNumber()
      : 0;

  const avgDaysToPayment = paymentData?.avgDays || 0;

  const cashFlowRatio = costs.gt(0)
    ? revenue.div(costs).times(100).toNumber()
    : 100;

  const lastYearCustomers = lastYearData?.count || 0;
  const thisYearCustomers = thisYearData?.count || 0;
  const customerRetentionRate =
    lastYearCustomers > 0
      ? new Decimal(thisYearCustomers)
          .div(lastYearCustomers)
          .times(100)
          .toNumber()
      : 0;

  return {
    profitMargin: Math.round(profitMargin * 10) / 10, // Round to 1 decimal
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgInvoiceValue: Math.round(avgInvoiceValue * 100) / 100, // Round to 2 decimals
    avgDaysToPayment,
    cashFlowRatio: Math.round(cashFlowRatio * 10) / 10,
    customerRetentionRate: Math.round(customerRetentionRate * 10) / 10,
  };
}

// ============================================================================
// EXECUTIVE SUMMARY
// ============================================================================

/**
 * Generate an executive summary from dashboard data.
 * Reuses getDashboardStats and getBusinessHealthMetrics — no extra queries.
 */
export async function getExecutiveSummary(
  db: Database,
  companyId: string,
  sinceDate?: Date,
): Promise<ExecutiveSummary> {
  const [stats, health] = await Promise.all([
    getDashboardStats(db, companyId, sinceDate),
    getBusinessHealthMetrics(db, companyId),
  ]);

  const highlights: ExecutiveSummaryHighlight[] = [];

  // 1. Revenue collected this month
  highlights.push({
    key: "summary.revenueCollected",
    params: {
      amount: stats.revenueThisMonth.value,
      count: stats.revenueThisMonth.count || 0,
    },
  });

  // 2. Outstanding invoices
  if (stats.outstandingInvoices.value > 0) {
    highlights.push({
      key: "summary.outstanding",
      params: {
        amount: stats.outstandingInvoices.value,
        count: stats.outstandingInvoices.count || 0,
      },
    });
  }

  // 3. Overdue warning
  if (stats.overdueInvoices.value > 0) {
    highlights.push({
      key: "summary.overdue",
      params: {
        amount: stats.overdueInvoices.value,
        count: stats.overdueInvoices.count || 0,
      },
    });
  }

  // 4. Profit margin context
  if (health.profitMargin !== 0) {
    const marginKey =
      health.profitMargin >= 20
        ? "summary.marginHealthy"
        : health.profitMargin >= 10
          ? "summary.marginModerate"
          : "summary.marginLow";
    highlights.push({
      key: marginKey,
      params: { margin: health.profitMargin },
    });
  }

  return { highlights };
}
