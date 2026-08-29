import { eq, and, sql, lt, inArray } from "drizzle-orm";
import { documents, bankTransactions, bankAccounts, inventoryItems } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { OVERDUE_ELIGIBLE_STATUSES } from "../config/document-constants";

/** Open repair orders still in draft or confirmed (not yet completed). */
export const OPEN_REPAIR_ORDER_STATUSES = ["draft", "confirmed"] as const;

export interface NavBadges {
  documents: number;
  money: number;
  repair: number;
  openRepairOrders: number;
}

/**
 * Aggregate counts for sidebar navigation badges.
 * Single domain entry point — actions only authenticate and delegate here.
 */
export async function getNavBadges(db: Database, companyId: string): Promise<NavBadges> {
  const now = new Date();

  const [overdueResult, unreconciledResult, repairResult, openRepairOrdersResult] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            eq(documents.type, "invoice"),
            inArray(documents.status, [...OVERDUE_ELIGIBLE_STATUSES]),
            lt(documents.dueDate, now),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bankTransactions)
        .innerJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
        .where(
          and(eq(bankAccounts.companyId, companyId), eq(bankTransactions.isReconciled, false)),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryItems)
        .where(and(eq(inventoryItems.companyId, companyId), eq(inventoryItems.status, "repair"))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            eq(documents.type, "repair_order"),
            inArray(documents.status, [...OPEN_REPAIR_ORDER_STATUSES]),
          ),
        ),
    ]);

  return {
    documents: overdueResult[0]?.count ?? 0,
    money: unreconciledResult[0]?.count ?? 0,
    repair: repairResult[0]?.count ?? 0,
    openRepairOrders: openRepairOrdersResult[0]?.count ?? 0,
  };
}
