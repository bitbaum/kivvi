"use server";

import {
  getDashboardPreferences,
  updateDashboardPreferences,
  resetDashboardPreferences,
  type DashboardPreferences,
} from "@kivvi/core/src/domain/dashboard-preferences";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";

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
