import { eq, and, count, desc } from "drizzle-orm";
import { contacts, documents, products, bankAccounts } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { getFinancialSummary } from "./documents";

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
 * Delegates financial metrics to getFinancialSummary() (SSOT) and
 * runs additional queries for contacts, products, recent docs, and bank balances.
 */
export async function fetchBusinessSnapshot(
  db: Database,
  companyId: string,
): Promise<BusinessSnapshot> {
  const [financials, contactCounts, productCounts, recentDocs, bankBalanceRows] = await Promise.all(
    [
      // Financial metrics (SSOT in documents.ts)
      getFinancialSummary(db, companyId),

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
    ],
  );

  // Parse contact counts
  const customerCount = contactCounts.find((c) => c.type === "customer")?.count ?? 0;
  const vendorCount = contactCounts.find((c) => c.type === "vendor")?.count ?? 0;
  const bothCount = contactCounts.find((c) => c.type === "both")?.count ?? 0;

  // Parse product counts
  const productCount = productCounts.find((c) => c.type === "product")?.count ?? 0;
  const serviceCount = productCounts.find((c) => c.type === "service")?.count ?? 0;

  return {
    customers: customerCount + bothCount,
    vendors: vendorCount + bothCount,
    productCount,
    serviceCount,
    ...financials,
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
      balance: b.balance ?? "0",
      currency: b.currency ?? "CHF",
    })),
  };
}
