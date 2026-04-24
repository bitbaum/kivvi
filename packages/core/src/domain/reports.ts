import Decimal from "decimal.js";
import { eq, and, sql, gte, lte, desc, asc } from "drizzle-orm";
import {
  accounts,
  journalEntries,
  journalLines,
  documents,
  documentItems,
  contacts,
  products,
  productGroups,
} from "@kivvi/database";
import type { Database } from "@kivvi/database";

// ============================================================================
// PURE HELPERS (no DB access — testable without database)
// ============================================================================

/**
 * Compute VAT amount from a taxable amount and a VAT rate.
 * All math uses Decimal.js — no float errors.
 * Returns string to preserve precision across function boundaries.
 */
export function computeVatAmount(
  taxableAmount: string,
  vatRate: string,
): string {
  const taxable = new Decimal(taxableAmount);
  const rate = new Decimal(vatRate);
  return taxable.times(rate.div(100)).toFixed(2);
}

/**
 * Classify a days-overdue value into an aging bucket.
 * Returns the bucket key: 'current' | 'days30' | 'days60' | 'days90' | 'over90'.
 */
export function classifyAgingBucket(
  daysOverdue: number,
): "current" | "days30" | "days60" | "days90" | "over90" {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "days30";
  if (daysOverdue <= 60) return "days60";
  if (daysOverdue <= 90) return "days90";
  return "over90";
}

/**
 * Compute days overdue given a due date and an as-of date.
 * Returns negative if not yet due, 0 if due today, positive if overdue.
 */
export function computeDaysOverdue(
  dueDate: Date | string,
  asOfDate: Date | string,
): number {
  const due = new Date(dueDate);
  const asOf = new Date(asOfDate);
  return Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Aggregate P&L rows into totals. Pure reduction over pre-computed row data.
 * Returns strings to preserve Decimal.js precision across function boundaries.
 */
export function computeProfitLossTotals(
  revenueAmounts: string[],
  expenseAmounts: string[],
): { totalRevenue: string; totalExpenses: string; netIncome: string } {
  const totalRevenue = revenueAmounts.reduce(
    (sum, a) => sum.plus(a || "0"),
    new Decimal(0),
  );
  const totalExpenses = expenseAmounts.reduce(
    (sum, a) => sum.plus(a || "0"),
    new Decimal(0),
  );
  return {
    totalRevenue: totalRevenue.toFixed(2),
    totalExpenses: totalExpenses.toFixed(2),
    netIncome: totalRevenue.minus(totalExpenses).toFixed(2),
  };
}

/**
 * Compute balance sheet retained earnings from totals.
 * Retained earnings = Total Assets - Total Liabilities - Total Equity (from accounts).
 */
export function computeRetainedEarnings(
  totalAssets: string,
  totalLiabilities: string,
  totalEquity: string,
): string {
  return new Decimal(totalAssets)
    .minus(totalLiabilities)
    .minus(totalEquity)
    .toFixed(2);
}

/**
 * Merge invoice and credit note rows into a unified monthly sales report row.
 * Pure data transformation. Returns string amounts to preserve precision.
 */
export function mergeSalesRows(
  invoiceRows: Array<{
    month: string;
    count: number;
    revenue: string;
    vatAmount: string;
  }>,
  creditRows: Array<{ month: string; count: number; amount: string }>,
): SalesReportRow[] {
  const creditMap = new Map(creditRows.map((r) => [r.month, r]));
  const allMonths = new Set([
    ...invoiceRows.map((r) => r.month),
    ...creditRows.map((r) => r.month),
  ]);

  return Array.from(allMonths)
    .sort()
    .map((month) => {
      const inv = invoiceRows.find((r) => r.month === month);
      const cn = creditMap.get(month);
      const revenue = new Decimal(inv?.revenue || "0");
      const creditAmount = new Decimal(cn?.amount || "0");
      return {
        month,
        invoiceCount: inv?.count || 0,
        revenue: revenue.toFixed(2),
        vatAmount: new Decimal(inv?.vatAmount || "0").toFixed(2),
        creditNoteCount: cn?.count || 0,
        creditNoteAmount: creditAmount.toFixed(2),
        netRevenue: revenue.minus(creditAmount).toFixed(2),
      };
    });
}

/**
 * Compute sales report totals from rows. Pure reduction.
 * Accumulates with Decimal.js, converts to string only at boundary.
 */
export function computeSalesTotals(
  rows: SalesReportRow[],
): Omit<SalesReportRow, "month"> {
  const acc = rows.reduce(
    (a, r) => ({
      invoiceCount: a.invoiceCount + r.invoiceCount,
      revenue: a.revenue.plus(r.revenue),
      vatAmount: a.vatAmount.plus(r.vatAmount),
      creditNoteCount: a.creditNoteCount + r.creditNoteCount,
      creditNoteAmount: a.creditNoteAmount.plus(r.creditNoteAmount),
      netRevenue: a.netRevenue.plus(r.netRevenue),
    }),
    {
      invoiceCount: 0,
      revenue: new Decimal(0),
      vatAmount: new Decimal(0),
      creditNoteCount: 0,
      creditNoteAmount: new Decimal(0),
      netRevenue: new Decimal(0),
    },
  );
  return {
    invoiceCount: acc.invoiceCount,
    revenue: acc.revenue.toFixed(2),
    vatAmount: acc.vatAmount.toFixed(2),
    creditNoteCount: acc.creditNoteCount,
    creditNoteAmount: acc.creditNoteAmount.toFixed(2),
    netRevenue: acc.netRevenue.toFixed(2),
  };
}

// ============================================================================
// PROFIT & LOSS (Erfolgsrechnung)
// ============================================================================

export interface ProfitLossRow {
  accountCode: string;
  accountName: string;
  amount: string;
}

export interface ProfitLossReport {
  revenue: ProfitLossRow[];
  expenses: ProfitLossRow[];
  totalRevenue: string;
  totalExpenses: string;
  netIncome: string;
  periodStart: string;
  periodEnd: string;
}

export async function getProfitAndLoss(
  db: Database,
  companyId: string,
  startDate: string,
  endDate: string,
): Promise<ProfitLossReport> {
  // Revenue accounts (credit - debit)
  const revenueRows = await db
    .select({
      code: accounts.code,
      name: accounts.name,
      amount: sql<string>`COALESCE(SUM(CAST(${journalLines.credit} AS DECIMAL) - CAST(${journalLines.debit} AS DECIMAL)), 0)`,
    })
    .from(accounts)
    .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
    .leftJoin(
      journalEntries,
      eq(journalLines.journalEntryId, journalEntries.id),
    )
    .where(
      and(
        eq(accounts.companyId, companyId),
        eq(accounts.type, "revenue"),
        sql`(${journalEntries.date} IS NULL OR (${journalEntries.date} >= ${startDate}::timestamp AND ${journalEntries.date} <= ${endDate}::timestamp))`,
      ),
    )
    .groupBy(accounts.id, accounts.code, accounts.name)
    .having(
      sql`COALESCE(SUM(CAST(${journalLines.credit} AS DECIMAL) - CAST(${journalLines.debit} AS DECIMAL)), 0) != 0`,
    )
    .orderBy(asc(accounts.code));

  // Expense accounts (debit - credit)
  const expenseRows = await db
    .select({
      code: accounts.code,
      name: accounts.name,
      amount: sql<string>`COALESCE(SUM(CAST(${journalLines.debit} AS DECIMAL) - CAST(${journalLines.credit} AS DECIMAL)), 0)`,
    })
    .from(accounts)
    .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
    .leftJoin(
      journalEntries,
      eq(journalLines.journalEntryId, journalEntries.id),
    )
    .where(
      and(
        eq(accounts.companyId, companyId),
        eq(accounts.type, "expense"),
        sql`(${journalEntries.date} IS NULL OR (${journalEntries.date} >= ${startDate}::timestamp AND ${journalEntries.date} <= ${endDate}::timestamp))`,
      ),
    )
    .groupBy(accounts.id, accounts.code, accounts.name)
    .having(
      sql`COALESCE(SUM(CAST(${journalLines.debit} AS DECIMAL) - CAST(${journalLines.credit} AS DECIMAL)), 0) != 0`,
    )
    .orderBy(asc(accounts.code));

  const revenue: ProfitLossRow[] = revenueRows.map((r) => ({
    accountCode: r.code,
    accountName: r.name,
    amount: new Decimal(r.amount || "0").toFixed(2),
  }));

  const expenses: ProfitLossRow[] = expenseRows.map((r) => ({
    accountCode: r.code,
    accountName: r.name,
    amount: new Decimal(r.amount || "0").toFixed(2),
  }));

  const totals = computeProfitLossTotals(
    revenueRows.map((r) => r.amount || "0"),
    expenseRows.map((r) => r.amount || "0"),
  );

  return {
    revenue,
    expenses,
    ...totals,
    periodStart: startDate,
    periodEnd: endDate,
  };
}

// ============================================================================
// BALANCE SHEET (Bilanz)
// ============================================================================

export interface BalanceSheetRow {
  accountCode: string;
  accountName: string;
  balance: string;
}

export interface BalanceSheetReport {
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  retainedEarnings: string;
  asOfDate: string;
}

export async function getBalanceSheet(
  db: Database,
  companyId: string,
  asOfDate: string,
): Promise<BalanceSheetReport> {
  const getBalances = async (
    type: "asset" | "liability" | "equity",
    isDebitNormal: boolean,
  ) => {
    const rows = await db
      .select({
        code: accounts.code,
        name: accounts.name,
        balance: isDebitNormal
          ? sql<string>`COALESCE(SUM(CAST(${journalLines.debit} AS DECIMAL) - CAST(${journalLines.credit} AS DECIMAL)), 0)`
          : sql<string>`COALESCE(SUM(CAST(${journalLines.credit} AS DECIMAL) - CAST(${journalLines.debit} AS DECIMAL)), 0)`,
      })
      .from(accounts)
      .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
      .leftJoin(
        journalEntries,
        eq(journalLines.journalEntryId, journalEntries.id),
      )
      .where(
        and(
          eq(accounts.companyId, companyId),
          eq(accounts.type, type),
          sql`(${journalEntries.date} IS NULL OR ${journalEntries.date} <= ${asOfDate}::timestamp)`,
        ),
      )
      .groupBy(accounts.id, accounts.code, accounts.name)
      .having(
        isDebitNormal
          ? sql`COALESCE(SUM(CAST(${journalLines.debit} AS DECIMAL) - CAST(${journalLines.credit} AS DECIMAL)), 0) != 0`
          : sql`COALESCE(SUM(CAST(${journalLines.credit} AS DECIMAL) - CAST(${journalLines.debit} AS DECIMAL)), 0) != 0`,
      )
      .orderBy(asc(accounts.code));

    return rows.map((r) => ({
      accountCode: r.code,
      accountName: r.name,
      balance: new Decimal(r.balance || "0").toFixed(2),
    }));
  };

  const assets = await getBalances("asset", true);
  const liabilities = await getBalances("liability", false);
  const equity = await getBalances("equity", false);

  const totalAssets = assets
    .reduce((sum, r) => sum.plus(r.balance), new Decimal(0))
    .toFixed(2);
  const totalLiabilities = liabilities
    .reduce((sum, r) => sum.plus(r.balance), new Decimal(0))
    .toFixed(2);
  const totalEquity = equity
    .reduce((sum, r) => sum.plus(r.balance), new Decimal(0))
    .toFixed(2);

  const retainedEarnings = computeRetainedEarnings(
    totalAssets,
    totalLiabilities,
    totalEquity,
  );

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    retainedEarnings,
    asOfDate,
  };
}

// ============================================================================
// VAT REPORT (MWST-Abrechnung)
// ============================================================================

export interface VatReportRow {
  rate: string;
  taxableAmount: string;
  vatAmount: string;
  documentCount: number;
}

export interface VatReport {
  salesVat: VatReportRow[];
  purchaseVat: VatReportRow[];
  totalSalesVat: string;
  totalPurchaseVat: string;
  vatPayable: string;
  periodStart: string;
  periodEnd: string;
}

export async function getVatReport(
  db: Database,
  companyId: string,
  startDate: string,
  endDate: string,
): Promise<VatReport> {
  // Sales VAT from invoices and credit notes
  const salesRows = await db
    .select({
      rate: documentItems.vatRate,
      taxableAmount: sql<string>`SUM(CAST(${documentItems.total} AS DECIMAL))`,
      documentCount: sql<number>`COUNT(DISTINCT ${documents.id})::int`,
    })
    .from(documentItems)
    .innerJoin(documents, eq(documentItems.documentId, documents.id))
    .where(
      and(
        eq(documents.companyId, companyId),
        sql`${documents.type} IN ('invoice', 'credit_note')`,
        sql`${documents.status} NOT IN ('draft', 'cancelled')`,
        gte(documents.issueDate, sql`${startDate}::timestamp`),
        lte(documents.issueDate, sql`${endDate}::timestamp`),
      ),
    )
    .groupBy(documentItems.vatRate)
    .orderBy(desc(documentItems.vatRate));

  const salesVat: VatReportRow[] = salesRows.map((r) => ({
    rate: r.rate || "0",
    taxableAmount: new Decimal(r.taxableAmount).toFixed(2),
    vatAmount: computeVatAmount(r.taxableAmount, r.rate || "0"),
    documentCount: r.documentCount,
  }));

  // Purchase VAT from purchase invoices
  const purchaseRows = await db
    .select({
      rate: documentItems.vatRate,
      taxableAmount: sql<string>`SUM(CAST(${documentItems.total} AS DECIMAL))`,
      documentCount: sql<number>`COUNT(DISTINCT ${documents.id})::int`,
    })
    .from(documentItems)
    .innerJoin(documents, eq(documentItems.documentId, documents.id))
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "purchase_invoice"),
        sql`${documents.status} NOT IN ('draft', 'cancelled')`,
        gte(documents.issueDate, sql`${startDate}::timestamp`),
        lte(documents.issueDate, sql`${endDate}::timestamp`),
      ),
    )
    .groupBy(documentItems.vatRate)
    .orderBy(desc(documentItems.vatRate));

  const purchaseVat: VatReportRow[] = purchaseRows.map((r) => ({
    rate: r.rate || "0",
    taxableAmount: new Decimal(r.taxableAmount).toFixed(2),
    vatAmount: computeVatAmount(r.taxableAmount, r.rate || "0"),
    documentCount: r.documentCount,
  }));

  const totalSalesVat = salesVat
    .reduce((sum, r) => sum.plus(r.vatAmount), new Decimal(0))
    .toFixed(2);
  const totalPurchaseVat = purchaseVat
    .reduce((sum, r) => sum.plus(r.vatAmount), new Decimal(0))
    .toFixed(2);

  return {
    salesVat,
    purchaseVat,
    totalSalesVat,
    totalPurchaseVat,
    vatPayable: new Decimal(totalSalesVat).minus(totalPurchaseVat).toFixed(2),
    periodStart: startDate,
    periodEnd: endDate,
  };
}

// ============================================================================
// AGING REPORT (Altersanalyse)
// ============================================================================

export interface AgingRow {
  contactId: string;
  contactName: string;
  current: string; // Not yet due
  days30: string; // 1-30 days overdue
  days60: string; // 31-60 days overdue
  days90: string; // 61-90 days overdue
  over90: string; // >90 days overdue
  total: string;
}

export interface AgingReport {
  rows: AgingRow[];
  totals: Omit<AgingRow, "contactId" | "contactName">;
  asOfDate: string;
}

export async function getAgingReport(
  db: Database,
  companyId: string,
  asOfDate: string,
  sinceDate?: Date,
): Promise<AgingReport> {
  // Get all unpaid invoices (optionally filtered by sinceDate to exclude old imports)
  const unpaidInvoices = await db
    .select({
      id: documents.id,
      contactId: documents.contactId,
      contactName: contacts.name,
      total: documents.total,
      dueDate: documents.dueDate,
    })
    .from(documents)
    .leftJoin(contacts, eq(documents.contactId, contacts.id))
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        sql`${documents.status} NOT IN ('draft', 'cancelled', 'paid')`,
        sinceDate ? gte(documents.issueDate, sinceDate) : undefined,
      ),
    );

  const asOf = new Date(asOfDate);

  // Use Decimal accumulators to avoid repeated number↔Decimal conversions
  interface AgingAccumulator {
    contactId: string;
    contactName: string;
    current: Decimal;
    days30: Decimal;
    days60: Decimal;
    days90: Decimal;
    over90: Decimal;
    total: Decimal;
  }

  const contactMap = new Map<string, AgingAccumulator>();

  for (const inv of unpaidInvoices) {
    const contactId = inv.contactId || "unknown";
    const contactName = inv.contactName || "Unknown Contact";
    const total = new Decimal(inv.total);

    if (!contactMap.has(contactId)) {
      contactMap.set(contactId, {
        contactId,
        contactName,
        current: new Decimal(0),
        days30: new Decimal(0),
        days60: new Decimal(0),
        days90: new Decimal(0),
        over90: new Decimal(0),
        total: new Decimal(0),
      });
    }

    const acc = contactMap.get(contactId)!;
    acc.total = acc.total.plus(total);

    if (!inv.dueDate) {
      acc.current = acc.current.plus(total);
      continue;
    }

    const daysOverdue = computeDaysOverdue(inv.dueDate, asOf);
    const bucket = classifyAgingBucket(daysOverdue);
    acc[bucket] = acc[bucket].plus(total);
  }

  // Compute totals from Decimal accumulators before converting to string
  const accumulators = Array.from(contactMap.values());
  const zero = {
    current: new Decimal(0),
    days30: new Decimal(0),
    days60: new Decimal(0),
    days90: new Decimal(0),
    over90: new Decimal(0),
    total: new Decimal(0),
  };
  const totalAcc = accumulators.reduce(
    (t, a) => ({
      current: t.current.plus(a.current),
      days30: t.days30.plus(a.days30),
      days60: t.days60.plus(a.days60),
      days90: t.days90.plus(a.days90),
      over90: t.over90.plus(a.over90),
      total: t.total.plus(a.total),
    }),
    zero,
  );

  // Convert to output format — .toString() only at the final boundary
  const rows: AgingRow[] = accumulators
    .map((a) => ({
      contactId: a.contactId,
      contactName: a.contactName,
      current: a.current.toFixed(2),
      days30: a.days30.toFixed(2),
      days60: a.days60.toFixed(2),
      days90: a.days90.toFixed(2),
      over90: a.over90.toFixed(2),
      total: a.total.toFixed(2),
    }))
    .sort((a, b) => new Decimal(b.total).comparedTo(new Decimal(a.total)));

  const totals = {
    current: totalAcc.current.toFixed(2),
    days30: totalAcc.days30.toFixed(2),
    days60: totalAcc.days60.toFixed(2),
    days90: totalAcc.days90.toFixed(2),
    over90: totalAcc.over90.toFixed(2),
    total: totalAcc.total.toFixed(2),
  };

  return { rows, totals, asOfDate };
}

// ============================================================================
// SALES REPORT
// ============================================================================

export interface SalesReportRow {
  month: string;
  invoiceCount: number;
  revenue: string;
  vatAmount: string;
  creditNoteCount: number;
  creditNoteAmount: string;
  netRevenue: string;
}

export interface SalesByCategoryRow {
  groupName: string;
  revenue: string;
  itemCount: number;
  percentage: string; // of total net revenue, e.g. "42.5"
}

export interface SalesReport {
  rows: SalesReportRow[];
  totals: Omit<SalesReportRow, "month">;
  byCategory: SalesByCategoryRow[];
  periodStart: string;
  periodEnd: string;
}

/**
 * Given raw category aggregates and total revenue, compute percentage share.
 * Pure — no DB access, fully testable.
 */
export function computeCategoryPercentages(
  rawRows: Array<{ groupName: string; revenue: string; itemCount: number }>,
  totalRevenue: string,
): SalesByCategoryRow[] {
  const total = new Decimal(totalRevenue);
  if (total.isZero()) {
    return rawRows.map((r) => ({ ...r, percentage: "0.0" }));
  }
  return rawRows.map((r) => ({
    ...r,
    percentage: new Decimal(r.revenue).div(total).times(100).toFixed(1),
  }));
}

export async function getSalesReport(
  db: Database,
  companyId: string,
  startDate: string,
  endDate: string,
): Promise<SalesReport> {
  // Monthly invoice totals
  const invoiceRows = await db
    .select({
      month: sql<string>`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`,
      count: sql<number>`COUNT(*)::int`,
      revenue: sql<string>`COALESCE(SUM(CAST(${documents.subtotal} AS DECIMAL)), 0)`,
      vatAmount: sql<string>`COALESCE(SUM(CAST(${documents.vatAmount} AS DECIMAL)), 0)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        sql`${documents.status} NOT IN ('draft', 'cancelled')`,
        gte(documents.issueDate, sql`${startDate}::timestamp`),
        lte(documents.issueDate, sql`${endDate}::timestamp`),
      ),
    )
    .groupBy(sql`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`);

  // Monthly credit note totals
  const creditRows = await db
    .select({
      month: sql<string>`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`,
      count: sql<number>`COUNT(*)::int`,
      amount: sql<string>`COALESCE(SUM(CAST(${documents.total} AS DECIMAL)), 0)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "credit_note"),
        sql`${documents.status} NOT IN ('draft', 'cancelled')`,
        gte(documents.issueDate, sql`${startDate}::timestamp`),
        lte(documents.issueDate, sql`${endDate}::timestamp`),
      ),
    )
    .groupBy(sql`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`);

  // Revenue by product category (documentItems → products → productGroups)
  const categoryRows = await db
    .select({
      groupName: sql<string>`COALESCE(${productGroups.name}, 'Uncategorized')`,
      revenue: sql<string>`COALESCE(SUM(CAST(${documentItems.total} AS DECIMAL)), 0)`,
      itemCount: sql<number>`COUNT(*)::int`,
    })
    .from(documentItems)
    .innerJoin(documents, eq(documentItems.documentId, documents.id))
    .leftJoin(products, eq(documentItems.productId, products.id))
    .leftJoin(productGroups, eq(products.productGroupId, productGroups.id))
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        sql`${documents.status} NOT IN ('draft', 'cancelled')`,
        gte(documents.issueDate, sql`${startDate}::timestamp`),
        lte(documents.issueDate, sql`${endDate}::timestamp`),
      ),
    )
    .groupBy(productGroups.name)
    .orderBy(desc(sql`SUM(CAST(${documentItems.total} AS DECIMAL))`));

  // Merge into monthly rows using pure helper
  const rows = mergeSalesRows(
    invoiceRows.map((r) => ({
      month: r.month,
      count: r.count,
      revenue: r.revenue,
      vatAmount: r.vatAmount,
    })),
    creditRows.map((r) => ({
      month: r.month,
      count: r.count,
      amount: r.amount,
    })),
  );

  const totals = computeSalesTotals(rows);

  // Compute percentage share per category using pure helper
  const byCategory = computeCategoryPercentages(
    categoryRows.map((r) => ({
      groupName: r.groupName,
      revenue: r.revenue,
      itemCount: r.itemCount,
    })),
    totals.revenue,
  );

  return {
    rows,
    totals,
    byCategory,
    periodStart: startDate,
    periodEnd: endDate,
  };
}
