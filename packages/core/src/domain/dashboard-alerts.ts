import Decimal from "decimal.js";
import { eq, and, sql, desc, gte, lte, inArray } from "drizzle-orm";
import {
  documents,
  products,
  stockMovements,
  bankTransactions,
  bankAccounts,
  inventoryItems,
} from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { detectOverdueInvoices } from "./dunning";
import { PIPELINE_THRESHOLDS } from "../config/pipeline-thresholds";

// ============================================================================
// TYPES
// ============================================================================

export interface AlertDraftBreakdown {
  type: string;
  count: number;
  total: string;
}

export interface AlertLowStockProduct {
  id: string;
  name: string;
  articleNumber: string | null;
  stockQuantity: string | null;
  minStock: number | null;
}

export type DashboardAlertMetadata =
  | { breakdown: AlertDraftBreakdown[] }
  | { products: AlertLowStockProduct[] };

export interface DashboardAlert {
  id: string;
  type:
    | "overdue_invoice"
    | "expiring_quote"
    | "draft_documents"
    | "low_stock"
    | "unreconciled_transaction"
    | "aging_repair"
    | "stale_inventory"
    | "stale_intake"
    | "stale_testing";
  severity: "urgent" | "warning" | "info";
  titleKey: string;
  descriptionKey: string;
  descriptionParams?: Record<string, string | number>;
  count?: number;
  amount?: number;
  linkTo: string;
  metadata?: DashboardAlertMetadata;
}

// ============================================================================
// DASHBOARD ALERTS
// ============================================================================

/**
 * Get all actionable alerts for the dashboard.
 * Returns alerts that require user attention.
 */
export async function getDashboardAlerts(
  db: Database,
  companyId: string,
  sinceDate?: Date,
): Promise<DashboardAlert[]> {
  const alerts: DashboardAlert[] = [];
  const now = new Date();

  // 1. Overdue invoices (filtered by sinceDate to exclude old imported data)
  let overdueInvoices = await detectOverdueInvoices(db, companyId);
  if (sinceDate) {
    overdueInvoices = overdueInvoices.filter((inv) => new Date(inv.issueDate) >= sinceDate);
  }
  if (overdueInvoices.length > 0) {
    const total = overdueInvoices
      .reduce((sum, inv) => sum.plus(new Decimal(inv.total || "0")), new Decimal(0))
      .toNumber();
    alerts.push({
      id: "overdue-invoices",
      type: "overdue_invoice",
      severity: "urgent",
      titleKey: "alerts.overdueInvoices",
      descriptionKey: "alerts.overdueInvoicesDesc",
      descriptionParams: { count: overdueInvoices.length },
      count: overdueInvoices.length,
      amount: total,
      linkTo: "/sales/invoices?status=overdue",
    });
  }

  // 2. Expiring quotes (sent quotes with dueDate within 7 days)
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const expiringQuotes = await db
    .select({
      id: documents.id,
      number: documents.number,
      total: documents.total,
      dueDate: documents.dueDate,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "quote"),
        inArray(documents.status, ["sent", "confirmed"]),
        sql`${documents.dueDate} IS NOT NULL`,
        gte(documents.dueDate, now),
        lte(documents.dueDate, sevenDaysFromNow),
      ),
    );

  if (expiringQuotes.length > 0) {
    const total = expiringQuotes
      .reduce((sum, q) => sum.plus(new Decimal(q.total || "0")), new Decimal(0))
      .toNumber();
    alerts.push({
      id: "expiring-quotes",
      type: "expiring_quote",
      severity: "warning",
      titleKey: "alerts.expiringQuotes",
      descriptionKey: "alerts.expiringQuotesDesc",
      descriptionParams: { count: expiringQuotes.length },
      count: expiringQuotes.length,
      amount: total,
      linkTo: "/sales/quotes?status=sent",
    });
  }

  // 3. Draft documents (grouped by type)
  const draftCounts = await db
    .select({
      type: documents.type,
      count: sql<number>`COUNT(*)::int`,
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
    })
    .from(documents)
    .where(and(eq(documents.companyId, companyId), eq(documents.status, "draft")))
    .groupBy(documents.type);

  const totalDrafts = draftCounts.reduce((sum, dc) => sum + dc.count, 0);
  if (totalDrafts > 0) {
    const total = draftCounts
      .reduce((sum, dc) => sum.plus(new Decimal(dc.total || "0")), new Decimal(0))
      .toNumber();
    alerts.push({
      id: "draft-documents",
      type: "draft_documents",
      severity: "info",
      titleKey: "alerts.draftDocuments",
      descriptionKey: "alerts.draftDocumentsDesc",
      descriptionParams: { count: totalDrafts },
      count: totalDrafts,
      amount: total,
      linkTo: "/sales?status=draft",
      metadata: { breakdown: draftCounts },
    });
  }

  // 4. Low stock products (where stockQuantity <= minStock).
  // Only products with at least one stock movement are considered — products
  // imported as a catalog without ever receiving stock should not fire this
  // alert, since their minStock is typically an import artifact.
  const lowStockProducts = await db
    .select({
      id: products.id,
      name: products.name,
      articleNumber: products.articleNumber,
      stockQuantity: products.stockQuantity,
      minStock: products.minStock,
    })
    .from(products)
    .where(
      and(
        eq(products.companyId, companyId),
        eq(products.isActive, true),
        sql`${products.minStock} IS NOT NULL AND CAST(${products.stockQuantity} AS DECIMAL) <= ${products.minStock}`,
        sql`EXISTS (SELECT 1 FROM ${stockMovements} sm WHERE sm.product_id = ${products.id})`,
      ),
    )
    .orderBy(desc(sql`${products.minStock} - CAST(${products.stockQuantity} AS DECIMAL)`))
    .limit(20);

  if (lowStockProducts.length > 0) {
    alerts.push({
      id: "low-stock",
      type: "low_stock",
      severity: "warning",
      titleKey: "alerts.lowStock",
      descriptionKey: "alerts.lowStockDesc",
      descriptionParams: { count: lowStockProducts.length },
      count: lowStockProducts.length,
      linkTo: "/inventory/products?filter=low-stock",
      metadata: { products: lowStockProducts },
    });
  }

  // 5. Unreconciled bank transactions
  const unreconciledTxns = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
      total: sql<string>`COALESCE(SUM(${bankTransactions.amount}::numeric), 0)`,
    })
    .from(bankTransactions)
    .innerJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
    .where(and(eq(bankAccounts.companyId, companyId), eq(bankTransactions.isReconciled, false)));

  const unreconciledCount = unreconciledTxns[0]?.count || 0;
  if (unreconciledCount > 0) {
    alerts.push({
      id: "unreconciled-transactions",
      type: "unreconciled_transaction",
      severity: "info",
      titleKey: "alerts.unreconciledTransactions",
      descriptionKey: "alerts.unreconciledTransactionsDesc",
      descriptionParams: { count: unreconciledCount },
      count: unreconciledCount,
      linkTo: "/banking/transactions?reconciled=false",
    });
  }

  // 6. Items aging in repair (>PIPELINE_THRESHOLDS.repair.alert days)
  const fourteenDaysAgo = new Date(
    now.getTime() - PIPELINE_THRESHOLDS.repair.alert * 24 * 60 * 60 * 1000,
  );
  const [agingRepairResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.companyId, companyId),
        eq(inventoryItems.status, "repair"),
        lte(inventoryItems.createdAt, fourteenDaysAgo),
      ),
    );

  const agingRepairCount = agingRepairResult?.count || 0;
  if (agingRepairCount > 0) {
    alerts.push({
      id: "aging-repairs",
      type: "aging_repair",
      severity: agingRepairCount >= 5 ? "urgent" : "warning",
      titleKey: "alerts.agingRepairs",
      descriptionKey: "alerts.agingRepairsDesc",
      descriptionParams: { count: agingRepairCount },
      count: agingRepairCount,
      linkTo: "/intake/repair-queue",
    });
  }

  // 7. Items stuck in intake > PIPELINE_THRESHOLDS.intake.alert days (processing backlog)
  const sevenDaysAgo = new Date(
    now.getTime() - PIPELINE_THRESHOLDS.intake.alert * 24 * 60 * 60 * 1000,
  );
  const [staleIntakeResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.companyId, companyId),
        eq(inventoryItems.status, "intake"),
        lte(inventoryItems.createdAt, sevenDaysAgo),
      ),
    );

  const staleIntakeCount = staleIntakeResult?.count || 0;
  if (staleIntakeCount > 0) {
    alerts.push({
      id: "stale-intake",
      type: "stale_intake",
      severity: staleIntakeCount >= 5 ? "urgent" : "warning",
      titleKey: "alerts.staleIntake",
      descriptionKey: "alerts.staleIntakeDesc",
      descriptionParams: { count: staleIntakeCount },
      count: staleIntakeCount,
      linkTo: "/intake/items?status=intake",
    });
  }

  // 8. Items stuck in testing > PIPELINE_THRESHOLDS.testing.alert days (assessment backlog)
  const [staleTestingResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.companyId, companyId),
        eq(inventoryItems.status, "testing"),
        lte(inventoryItems.createdAt, fourteenDaysAgo),
      ),
    );

  const staleTestingCount = staleTestingResult?.count || 0;
  if (staleTestingCount > 0) {
    alerts.push({
      id: "stale-testing",
      type: "stale_testing",
      severity: staleTestingCount >= 5 ? "urgent" : "warning",
      titleKey: "alerts.staleTesting",
      descriptionKey: "alerts.staleTestingDesc",
      descriptionParams: { count: staleTestingCount },
      count: staleTestingCount,
      linkTo: "/intake/items?status=testing",
    });
  }

  // 10. Items in ready_for_sale not sold after PIPELINE_THRESHOLDS.ready_for_sale.alert days
  const sixtyDaysAgo = new Date(
    now.getTime() - PIPELINE_THRESHOLDS.ready_for_sale.alert * 24 * 60 * 60 * 1000,
  );
  const [staleReadyResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.companyId, companyId),
        eq(inventoryItems.status, "ready_for_sale"),
        lte(inventoryItems.updatedAt, sixtyDaysAgo),
      ),
    );

  const staleReadyCount = staleReadyResult?.count || 0;
  if (staleReadyCount > 0) {
    alerts.push({
      id: "stale-inventory",
      type: "stale_inventory",
      severity: "info",
      titleKey: "alerts.staleInventory",
      descriptionKey: "alerts.staleInventoryDesc",
      descriptionParams: { count: staleReadyCount },
      count: staleReadyCount,
      linkTo: "/intake/items?status=ready_for_sale",
    });
  }

  return alerts;
}
