"use server";

import { db } from "@/lib/db";
import {
  createRecurringConfig,
  updateRecurringConfig,
  deleteRecurringConfig,
  createRecurringConfigSchema,
  updateRecurringConfigSchema,
} from "@kivvi/core";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";

// ============================================================================
// SERVER ACTIONS
// ============================================================================

export const createRecurringConfigAction = createAction<
  unknown,
  { id: string }
>({
  handler: async (input, { companyId, db }) => {
    const parsed = createRecurringConfigSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      throw new Error(`${firstError.path.join(".")}: ${firstError.message}`);
    }
    const config = await createRecurringConfig(db, companyId, parsed.data);
    return { id: config.id };
  },
  revalidate: ["/settings/recurring-invoices"],
  errorMessage: () =>
    getTranslations("settings.recurring").then((t) => t("errorCreateFailed")),
  minRole: "member",
});

export const updateRecurringConfigAction = createAction<
  { configId: string; input: unknown },
  { id: string }
>({
  handler: async ({ configId, input }, { companyId, db }) => {
    const parsed = updateRecurringConfigSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      throw new Error(`${firstError.path.join(".")}: ${firstError.message}`);
    }
    const config = await updateRecurringConfig(
      db,
      companyId,
      configId,
      parsed.data,
    );
    return { id: config.id };
  },
  revalidate: [
    "/settings/recurring-invoices",
    "/settings/recurring-invoices/[id]",
  ],
  errorMessage: () =>
    getTranslations("settings.recurring").then((t) => t("errorUpdateFailed")),
  minRole: "member",
});

export const deleteRecurringConfigAction = createAction<string, void>({
  handler: async (configId, { companyId, db }) => {
    await deleteRecurringConfig(db, companyId, configId);
  },
  revalidate: ["/settings/recurring-invoices"],
  errorMessage: () =>
    getTranslations("settings.recurring").then((t) => t("errorDeleteFailed")),
  minRole: "member",
});

export const toggleRecurringConfigAction = createAction<
  { configId: string; isActive: boolean },
  void
>({
  handler: async ({ configId, isActive }, { companyId, db }) => {
    await updateRecurringConfig(db, companyId, configId, { isActive });
  },
  revalidate: ["/settings/recurring-invoices"],
  errorMessage: () =>
    getTranslations("settings.recurring").then((t) => t("errorToggleFailed")),
  minRole: "member",
});
