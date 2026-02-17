import { eq, and, sql, count, desc, gte, inArray } from 'drizzle-orm';
import { contacts, documents, products, bankAccounts } from '@kivvi/database';
import type { Database } from '@kivvi/database';

export interface BusinessSnapshot {
  customers: number;
  vendors: number;
  productCount: number;
  serviceCount: number;
  revenueThisMonth: number;
  revenueThisMonthCount: number;
  revenueThisYear: number;
  outstandingTotal: number;
  outstandingCount: number;
  overdueTotal: number;
  overdueCount: number;
  draftsTotal: number;
  draftsCount: number;
  recentDocuments: Array<{
    number: string;
    type: string;
    status: string;
    total: string;
    currency: string;
    dueDate: Date | null;
    contactName: string | null;
  }>;
  bankBalances: Array<{
    name: string;
    iban: string | null;
    balance: string;
    currency: string;
  }>;
}

/**
 * Fetch a snapshot of key business metrics for the AI system prompt.
 * All queries run in parallel for speed.
 */
export async function fetchBusinessSnapshot(
  db: Database,
  companyId: string
): Promise<BusinessSnapshot> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    contactCounts,
    productCounts,
    monthlyRevenue,
    yearlyRevenue,
    outstanding,
    overdue,
    drafts,
    recentDocs,
    bankBalanceRows,
  ] = await Promise.all([
    // Contact counts by type
    db
      .select({ type: contacts.type, count: count() })
      .from(contacts)
      .where(and(eq(contacts.companyId, companyId), eq(contacts.isActive, true)))
      .groupBy(contacts.type),

    // Product/service counts
    db
      .select({ type: products.type, count: count() })
      .from(products)
      .where(and(eq(products.companyId, companyId), eq(products.isActive, true)))
      .groupBy(products.type),

    // Revenue this month (paid invoices)
    db
      .select({
        total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
        count: count(),
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, 'invoice'),
          eq(documents.status, 'paid'),
          gte(documents.paidDate, startOfMonth)
        )
      ),

    // Revenue this year
    db
      .select({
        total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, 'invoice'),
          eq(documents.status, 'paid'),
          gte(documents.paidDate, startOfYear)
        )
      ),

    // Outstanding invoices
    db
      .select({
        total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
        count: count(),
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, 'invoice'),
          inArray(documents.status, ['sent', 'confirmed', 'delivered', 'partially_paid'])
        )
      ),

    // Overdue invoices
    db
      .select({
        total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
        count: count(),
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, 'invoice'),
          eq(documents.status, 'overdue')
        )
      ),

    // Draft invoices
    db
      .select({
        total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
        count: count(),
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          eq(documents.type, 'invoice'),
          eq(documents.status, 'draft')
        )
      ),

    // Last 5 recent documents with contact name
    db
      .select({
        number: documents.number,
        type: documents.type,
        status: documents.status,
        total: documents.total,
        currency: documents.currency,
        dueDate: documents.dueDate,
        contactName: contacts.name,
      })
      .from(documents)
      .leftJoin(contacts, eq(documents.contactId, contacts.id))
      .where(eq(documents.companyId, companyId))
      .orderBy(desc(documents.createdAt))
      .limit(5),

    // Bank account balances
    db
      .select({
        name: bankAccounts.name,
        iban: bankAccounts.iban,
        balance: bankAccounts.balance,
        currency: bankAccounts.currency,
      })
      .from(bankAccounts)
      .where(eq(bankAccounts.companyId, companyId)),
  ]);

  // Parse contact counts
  const customerCount = contactCounts.find((c) => c.type === 'customer')?.count ?? 0;
  const vendorCount = contactCounts.find((c) => c.type === 'vendor')?.count ?? 0;
  const bothCount = contactCounts.find((c) => c.type === 'both')?.count ?? 0;

  // Parse product counts
  const productCount = productCounts.find((c) => c.type === 'product')?.count ?? 0;
  const serviceCount = productCounts.find((c) => c.type === 'service')?.count ?? 0;

  return {
    customers: customerCount + bothCount,
    vendors: vendorCount + bothCount,
    productCount,
    serviceCount,
    revenueThisMonth: Number(monthlyRevenue[0].total),
    revenueThisMonthCount: monthlyRevenue[0].count,
    revenueThisYear: Number(yearlyRevenue[0].total),
    outstandingTotal: Number(outstanding[0].total),
    outstandingCount: outstanding[0].count,
    overdueTotal: Number(overdue[0].total),
    overdueCount: overdue[0].count,
    draftsTotal: Number(drafts[0].total),
    draftsCount: drafts[0].count,
    recentDocuments: recentDocs.map((d) => ({
      number: d.number,
      type: d.type,
      status: d.status,
      total: d.total,
      currency: d.currency,
      dueDate: d.dueDate,
      contactName: d.contactName,
    })),
    bankBalances: bankBalanceRows.map((b) => ({
      name: b.name,
      iban: b.iban,
      balance: b.balance ?? '0',
      currency: b.currency ?? 'CHF',
    })),
  };
}
