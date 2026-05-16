"use server";

import {
  getDashboardPreferences,
  updateDashboardPreferences,
  resetDashboardPreferences,
  type DashboardPreferences,
} from "@kivvi/core/src/domain/dashboard-preferences";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import {
  documents,
  bankTransactions,
  bankAccounts,
  inventoryItems,
} from "@kivvi/database";
import { eq, and, sql, lt, inArray } from "drizzle-orm";
import { OVERDUE_ELIGIBLE_STATUSES } from "@/lib/config/document-types";
import { type ActionResult, getSession } from "./utils";

export interface NavBadges {
  documents: number;
  money: number;
  repair: number;
  openRepairOrders: number;
}

export async function getNavBadgesAction(): Promise<ActionResult<NavBadges>> {
  try {
    const { companyId } = await getSession();
    const now = new Date();

    const [
      overdueResult,
      unreconciledResult,
      repairResult,
      openRepairOrdersResult,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            eq(documents.type, "invoice"),
            inArray(documents.status, OVERDUE_ELIGIBLE_STATUSES),
            lt(documents.dueDate, now),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bankTransactions)
        .innerJoin(
          bankAccounts,
          eq(bankTransactions.bankAccountId, bankAccounts.id),
        )
        .where(
          and(
            eq(bankAccounts.companyId, companyId),
            eq(bankTransactions.isReconciled, false),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.companyId, companyId),
            eq(inventoryItems.status, "repair"),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            eq(documents.type, "repair_order"),
            inArray(documents.status, ["draft", "confirmed"]),
          ),
        ),
    ]);

    return {
      success: true,
      data: {
        documents: overdueResult[0]?.count ?? 0,
        money: unreconciledResult[0]?.count ?? 0,
        repair: repairResult[0]?.count ?? 0,
        openRepairOrders: openRepairOrdersResult[0]?.count ?? 0,
      },
    };
  } catch {
    return {
      success: true,
      data: { documents: 0, money: 0, repair: 0, openRepairOrders: 0 },
    };
  }
}

export const getDashboardPreferencesAction = createAction<
  void,
  DashboardPreferences
>({
  handler: async (_input, { companyId, db }) => {
    return getDashboardPreferences(db, companyId);
  },
  errorMessage: () =>
    getTranslations("dashboard").then((t) => t("errorLoadPreferences")),
});

export const updateDashboardPreferencesAction = createAction<
  Partial<DashboardPreferences>,
  void
>({
  handler: async (preferences, { companyId, db }) => {
    await updateDashboardPreferences(db, companyId, preferences);
  },
  revalidate: ["/dashboard"],
  errorMessage: () =>
    getTranslations("dashboard").then((t) => t("errorSavePreferences")),
});

export const resetDashboardPreferencesAction = createAction<void, void>({
  handler: async (_input, { companyId, db }) => {
    await resetDashboardPreferences(db, companyId);
  },
  revalidate: ["/dashboard"],
  errorMessage: () =>
    getTranslations("dashboard").then((t) => t("errorResetPreferences")),
});
