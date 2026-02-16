import Decimal from 'decimal.js';
import { eq, and, sql, gte, lte, desc, asc } from 'drizzle-orm';
import {
  accounts,
  journalEntries,
  journalLines,
  documents,
  documentItems,
  contacts,
} from '@kivvi/database';
import type { Database } from '@kivvi/database';

// ============================================================================
// PROFIT & LOSS (Erfolgsrechnung)
// ============================================================================

export interface ProfitLossRow {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface ProfitLossReport {
  revenue: ProfitLossRow[];
  expenses: ProfitLossRow[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  periodStart: string;
  periodEnd: string;
}

export async function getProfitAndLoss(
  db: Database,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<ProfitLossReport> {
  // Revenue accounts (credit - debit)
  const revenueRows = await db
    .select({
      code: accounts.code,
      name: accounts.name,
      amount: sql<number>`COALESCE(SUM(CAST(${journalLines.credit} AS DECIMAL) - CAST(${journalLines.debit} AS DECIMAL)), 0)`,
    })
    .from(accounts)
    .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
    .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(accounts.companyId, companyId),
        eq(accounts.type, 'revenue'),
        sql`(${journalEntries.date} IS NULL OR (${journalEntries.date} >= ${startDate}::timestamp AND ${journalEntries.date} <= ${endDate}::timestamp))`
      )
    )
    .groupBy(accounts.id, accounts.code, accounts.name)
    .having(sql`COALESCE(SUM(CAST(${journalLines.credit} AS DECIMAL) - CAST(${journalLines.debit} AS DECIMAL)), 0) != 0`)
    .orderBy(asc(accounts.code));

  // Expense accounts (debit - credit)
  const expenseRows = await db
    .select({
      code: accounts.code,
      name: accounts.name,
      amount: sql<number>`COALESCE(SUM(CAST(${journalLines.debit} AS DECIMAL) - CAST(${journalLines.credit} AS DECIMAL)), 0)`,
    })
    .from(accounts)
    .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
    .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(accounts.companyId, companyId),
        eq(accounts.type, 'expense'),
        sql`(${journalEntries.date} IS NULL OR (${journalEntries.date} >= ${startDate}::timestamp AND ${journalEntries.date} <= ${endDate}::timestamp))`
      )
    )
    .groupBy(accounts.id, accounts.code, accounts.name)
    .having(sql`COALESCE(SUM(CAST(${journalLines.debit} AS DECIMAL) - CAST(${journalLines.credit} AS DECIMAL)), 0) != 0`)
    .orderBy(asc(accounts.code));

  const revenue: ProfitLossRow[] = revenueRows.map((r) => ({
    accountCode: r.code,
    accountName: r.name,
    amount: Number(r.amount),
  }));

  const expenses: ProfitLossRow[] = expenseRows.map((r) => ({
    accountCode: r.code,
    accountName: r.name,
    amount: Number(r.amount),
  }));

  const totalRevenue = revenue.reduce((sum, r) => sum.plus(r.amount), new Decimal(0)).toNumber();
  const totalExpenses = expenses.reduce((sum, r) => sum.plus(r.amount), new Decimal(0)).toNumber();

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
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
  balance: number;
}

export interface BalanceSheetReport {
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  retainedEarnings: number;
  asOfDate: string;
}

export async function getBalanceSheet(
  db: Database,
  companyId: string,
  asOfDate: string
): Promise<BalanceSheetReport> {
  const getBalances = async (type: 'asset' | 'liability' | 'equity', isDebitNormal: boolean) => {
    const rows = await db
      .select({
        code: accounts.code,
        name: accounts.name,
        balance: isDebitNormal
          ? sql<number>`COALESCE(SUM(CAST(${journalLines.debit} AS DECIMAL) - CAST(${journalLines.credit} AS DECIMAL)), 0)`
          : sql<number>`COALESCE(SUM(CAST(${journalLines.credit} AS DECIMAL) - CAST(${journalLines.debit} AS DECIMAL)), 0)`,
      })
      .from(accounts)
      .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(accounts.companyId, companyId),
          eq(accounts.type, type),
          sql`(${journalEntries.date} IS NULL OR ${journalEntries.date} <= ${asOfDate}::timestamp)`
        )
      )
      .groupBy(accounts.id, accounts.code, accounts.name)
      .having(
        isDebitNormal
          ? sql`COALESCE(SUM(CAST(${journalLines.debit} AS DECIMAL) - CAST(${journalLines.credit} AS DECIMAL)), 0) != 0`
          : sql`COALESCE(SUM(CAST(${journalLines.credit} AS DECIMAL) - CAST(${journalLines.debit} AS DECIMAL)), 0) != 0`
      )
      .orderBy(asc(accounts.code));

    return rows.map((r) => ({
      accountCode: r.code,
      accountName: r.name,
      balance: Number(r.balance),
    }));
  };

  const assets = await getBalances('asset', true);
  const liabilities = await getBalances('liability', false);
  const equity = await getBalances('equity', false);

  const totalAssets = assets.reduce((sum, r) => sum.plus(r.balance), new Decimal(0)).toNumber();
  const totalLiabilities = liabilities.reduce((sum, r) => sum.plus(r.balance), new Decimal(0)).toNumber();
  const totalEquity = equity.reduce((sum, r) => sum.plus(r.balance), new Decimal(0)).toNumber();

  // Retained earnings = Total Assets - Total Liabilities - Equity from accounts
  const retainedEarnings = new Decimal(totalAssets).minus(totalLiabilities).minus(totalEquity).toNumber();

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
  taxableAmount: number;
  vatAmount: number;
  documentCount: number;
}

export interface VatReport {
  salesVat: VatReportRow[];
  purchaseVat: VatReportRow[];
  totalSalesVat: number;
  totalPurchaseVat: number;
  vatPayable: number;
  periodStart: string;
  periodEnd: string;
}

export async function getVatReport(
  db: Database,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<VatReport> {
  // Sales VAT from invoices and credit notes
  const salesRows = await db
    .select({
      rate: documentItems.vatRate,
      taxableAmount: sql<number>`SUM(CAST(${documentItems.total} AS DECIMAL))`,
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
        lte(documents.issueDate, sql`${endDate}::timestamp`)
      )
    )
    .groupBy(documentItems.vatRate)
    .orderBy(desc(documentItems.vatRate));

  const salesVat: VatReportRow[] = salesRows.map((r) => {
    const taxable = new Decimal(r.taxableAmount);
    const rate = new Decimal(r.rate || '0');
    // For credit notes, amounts would be negative, so VAT computation handles both
    return {
      rate: r.rate || '0',
      taxableAmount: taxable.toNumber(),
      vatAmount: taxable.times(rate.div(100)).toNumber(),
      documentCount: r.documentCount,
    };
  });

  // Purchase VAT from purchase invoices
  const purchaseRows = await db
    .select({
      rate: documentItems.vatRate,
      taxableAmount: sql<number>`SUM(CAST(${documentItems.total} AS DECIMAL))`,
      documentCount: sql<number>`COUNT(DISTINCT ${documents.id})::int`,
    })
    .from(documentItems)
    .innerJoin(documents, eq(documentItems.documentId, documents.id))
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, 'purchase_invoice'),
        sql`${documents.status} NOT IN ('draft', 'cancelled')`,
        gte(documents.issueDate, sql`${startDate}::timestamp`),
        lte(documents.issueDate, sql`${endDate}::timestamp`)
      )
    )
    .groupBy(documentItems.vatRate)
    .orderBy(desc(documentItems.vatRate));

  const purchaseVat: VatReportRow[] = purchaseRows.map((r) => {
    const taxable = new Decimal(r.taxableAmount);
    const rate = new Decimal(r.rate || '0');
    return {
      rate: r.rate || '0',
      taxableAmount: taxable.toNumber(),
      vatAmount: taxable.times(rate.div(100)).toNumber(),
      documentCount: r.documentCount,
    };
  });

  const totalSalesVat = salesVat.reduce((sum, r) => sum.plus(r.vatAmount), new Decimal(0)).toNumber();
  const totalPurchaseVat = purchaseVat.reduce((sum, r) => sum.plus(r.vatAmount), new Decimal(0)).toNumber();

  return {
    salesVat,
    purchaseVat,
    totalSalesVat,
    totalPurchaseVat,
    vatPayable: new Decimal(totalSalesVat).minus(totalPurchaseVat).toNumber(),
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
  current: number;    // Not yet due
  days30: number;     // 1-30 days overdue
  days60: number;     // 31-60 days overdue
  days90: number;     // 61-90 days overdue
  over90: number;     // >90 days overdue
  total: number;
}

export interface AgingReport {
  rows: AgingRow[];
  totals: Omit<AgingRow, 'contactId' | 'contactName'>;
  asOfDate: string;
}

export async function getAgingReport(
  db: Database,
  companyId: string,
  asOfDate: string
): Promise<AgingReport> {
  // Get all unpaid invoices
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
        eq(documents.type, 'invoice'),
        sql`${documents.status} NOT IN ('draft', 'cancelled', 'paid')`
      )
    );

  const asOf = new Date(asOfDate);
  const contactMap = new Map<string, AgingRow>();

  for (const inv of unpaidInvoices) {
    const contactId = inv.contactId || 'unknown';
    const contactName = inv.contactName || 'Unknown Contact';
    const total = new Decimal(inv.total);

    if (!contactMap.has(contactId)) {
      contactMap.set(contactId, {
        contactId,
        contactName,
        current: 0,
        days30: 0,
        days60: 0,
        days90: 0,
        over90: 0,
        total: 0,
      });
    }

    const row = contactMap.get(contactId)!;
    row.total = new Decimal(row.total).plus(total).toNumber();

    if (!inv.dueDate) {
      row.current = new Decimal(row.current).plus(total).toNumber();
      continue;
    }

    const dueDate = new Date(inv.dueDate);
    const daysOverdue = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      row.current = new Decimal(row.current).plus(total).toNumber();
    } else if (daysOverdue <= 30) {
      row.days30 = new Decimal(row.days30).plus(total).toNumber();
    } else if (daysOverdue <= 60) {
      row.days60 = new Decimal(row.days60).plus(total).toNumber();
    } else if (daysOverdue <= 90) {
      row.days90 = new Decimal(row.days90).plus(total).toNumber();
    } else {
      row.over90 = new Decimal(row.over90).plus(total).toNumber();
    }
  }

  const rows = Array.from(contactMap.values()).sort((a, b) => b.total - a.total);

  const totals = rows.reduce(
    (acc, r) => ({
      current: new Decimal(acc.current).plus(r.current).toNumber(),
      days30: new Decimal(acc.days30).plus(r.days30).toNumber(),
      days60: new Decimal(acc.days60).plus(r.days60).toNumber(),
      days90: new Decimal(acc.days90).plus(r.days90).toNumber(),
      over90: new Decimal(acc.over90).plus(r.over90).toNumber(),
      total: new Decimal(acc.total).plus(r.total).toNumber(),
    }),
    { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 }
  );

  return { rows, totals, asOfDate };
}

// ============================================================================
// SALES REPORT
// ============================================================================

export interface SalesReportRow {
  month: string;
  invoiceCount: number;
  revenue: number;
  vatAmount: number;
  creditNoteCount: number;
  creditNoteAmount: number;
  netRevenue: number;
}

export interface SalesReport {
  rows: SalesReportRow[];
  totals: Omit<SalesReportRow, 'month'>;
  periodStart: string;
  periodEnd: string;
}

export async function getSalesReport(
  db: Database,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<SalesReport> {
  // Monthly invoice totals
  const invoiceRows = await db
    .select({
      month: sql<string>`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`,
      count: sql<number>`COUNT(*)::int`,
      revenue: sql<number>`COALESCE(SUM(CAST(${documents.subtotal} AS DECIMAL)), 0)`,
      vatAmount: sql<number>`COALESCE(SUM(CAST(${documents.vatAmount} AS DECIMAL)), 0)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, 'invoice'),
        sql`${documents.status} NOT IN ('draft', 'cancelled')`,
        gte(documents.issueDate, sql`${startDate}::timestamp`),
        lte(documents.issueDate, sql`${endDate}::timestamp`)
      )
    )
    .groupBy(sql`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`);

  // Monthly credit note totals
  const creditRows = await db
    .select({
      month: sql<string>`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`,
      count: sql<number>`COUNT(*)::int`,
      amount: sql<number>`COALESCE(SUM(CAST(${documents.total} AS DECIMAL)), 0)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, 'credit_note'),
        sql`${documents.status} NOT IN ('draft', 'cancelled')`,
        gte(documents.issueDate, sql`${startDate}::timestamp`),
        lte(documents.issueDate, sql`${endDate}::timestamp`)
      )
    )
    .groupBy(sql`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${documents.issueDate}, 'YYYY-MM')`);

  // Merge into monthly rows
  const creditMap = new Map(creditRows.map((r) => [r.month, r]));
  const allMonths = new Set([
    ...invoiceRows.map((r) => r.month),
    ...creditRows.map((r) => r.month),
  ]);

  const rows: SalesReportRow[] = Array.from(allMonths)
    .sort()
    .map((month) => {
      const inv = invoiceRows.find((r) => r.month === month);
      const cn = creditMap.get(month);
      const revenue = Number(inv?.revenue || 0);
      const creditAmount = Number(cn?.amount || 0);
      return {
        month,
        invoiceCount: inv?.count || 0,
        revenue,
        vatAmount: Number(inv?.vatAmount || 0),
        creditNoteCount: cn?.count || 0,
        creditNoteAmount: creditAmount,
        netRevenue: new Decimal(revenue).minus(creditAmount).toNumber(),
      };
    });

  const totals = rows.reduce(
    (acc, r) => ({
      invoiceCount: acc.invoiceCount + r.invoiceCount,
      revenue: new Decimal(acc.revenue).plus(r.revenue).toNumber(),
      vatAmount: new Decimal(acc.vatAmount).plus(r.vatAmount).toNumber(),
      creditNoteCount: acc.creditNoteCount + r.creditNoteCount,
      creditNoteAmount: new Decimal(acc.creditNoteAmount).plus(r.creditNoteAmount).toNumber(),
      netRevenue: new Decimal(acc.netRevenue).plus(r.netRevenue).toNumber(),
    }),
    { invoiceCount: 0, revenue: 0, vatAmount: 0, creditNoteCount: 0, creditNoteAmount: 0, netRevenue: 0 }
  );

  return { rows, totals, periodStart: startDate, periodEnd: endDate };
}
