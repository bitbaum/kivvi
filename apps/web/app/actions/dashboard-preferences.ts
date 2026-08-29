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
import { type ActionResult, getSession } from "./utils";
import { getNavBadges, type NavBadges } from "@kivvi/core/src/domain/nav-badges";

export type { NavBadges };

export async function getNavBadgesAction(): Promise<ActionResult<NavBadges>> {
  try {
    const { companyId } = await getSession();
    const data = await getNavBadges(db, companyId);
    return { success: true, data };
  } catch {
    return {
      success: true,
      data: { documents: 0, money: 0, repair: 0, openRepairOrders: 0 },
    };
  }
}

export const getDashboardPreferencesAction = createAction<void, DashboardPreferences>({
  handler: async (_input, { companyId, db }) => {
    return getDashboardPreferences(db, companyId);
  },
  errorMessage: () => getTranslations("dashboard").then((t) => t("errorLoadPreferences")),
});

export const updateDashboardPreferencesAction = createAction<Partial<DashboardPreferences>, void>({
  handler: async (preferences, { companyId, db }) => {
    await updateDashboardPreferences(db, companyId, preferences);
  },
  revalidate: ["/dashboard"],
  errorMessage: () => getTranslations("dashboard").then((t) => t("errorSavePreferences")),
});

export const resetDashboardPreferencesAction = createAction<void, void>({
  handler: async (_input, { companyId, db }) => {
    await resetDashboardPreferences(db, companyId);
  },
  revalidate: ["/dashboard"],
  errorMessage: () => getTranslations("dashboard").then((t) => t("errorResetPreferences")),
});
