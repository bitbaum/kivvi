"use server";

import {
  createAccount,
  updateAccount,
  toggleAccount,
  createJournalEntry,
  deleteJournalEntry,
  createFiscalYear,
  closeFiscalPeriod,
  closeFiscalYear,
  seedChartOfAccounts,
  createAccountSchema,
  updateAccountSchema,
  createJournalEntrySchema,
  createFiscalYearSchema,
} from "@kivvi/core";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

export const createAccountAction = createAction<
  unknown,
  Awaited<ReturnType<typeof createAccount>>
>({
  handler: async (input, { companyId, db }) => {
    const parsed = createAccountSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createAccount(db, companyId, parsed.data);
  },
  revalidate: ["/accounting"],
  errorMessage: () =>
    getTranslations("accounting").then((t) => t("errorCreateAccount")),
  minRole: "member",
});

export const updateAccountAction = createAction<
  { accountId: string; input: unknown },
  Awaited<ReturnType<typeof updateAccount>>
>({
  handler: async ({ accountId, input }, { companyId, db }) => {
    const parsed = updateAccountSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return updateAccount(db, companyId, accountId, parsed.data);
  },
  revalidate: ["/accounting"],
  errorMessage: () =>
    getTranslations("accounting").then((t) => t("errorUpdateAccount")),
  minRole: "member",
});

export const toggleAccountAction = createAction<
  string,
  Awaited<ReturnType<typeof toggleAccount>>
>({
  handler: async (accountId, { companyId, db }) => {
    return toggleAccount(db, companyId, accountId);
  },
  revalidate: ["/accounting"],
  errorMessage: () =>
    getTranslations("accounting").then((t) => t("errorToggleAccount")),
  minRole: "member",
});

export const seedChartOfAccountsAction = createAction<void, { count: number }>({
  handler: async (_input, { companyId, db }) => {
    const count = await seedChartOfAccounts(db, companyId);
    return { count };
  },
  revalidate: ["/accounting"],
  errorMessage: () =>
    getTranslations("accounting").then((t) => t("errorSeedAccounts")),
  minRole: "admin",
});

// ============================================================================
// JOURNAL ENTRIES
// ============================================================================

export const createJournalEntryAction = createAction<
  unknown,
  Awaited<ReturnType<typeof createJournalEntry>>
>({
  handler: async (input, { companyId, userId, db }) => {
    const parsed = createJournalEntrySchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createJournalEntry(db, companyId, userId, parsed.data);
  },
  revalidate: ["/accounting/journal"],
  errorMessage: () =>
    getTranslations("accounting").then((t) => t("errorCreateJournalEntry")),
  minRole: "member",
});

export const deleteJournalEntryAction = createAction<string, void>({
  handler: async (entryId, { companyId, db }) => {
    await deleteJournalEntry(db, companyId, entryId);
  },
  revalidate: ["/accounting/journal"],
  errorMessage: () =>
    getTranslations("accounting").then((t) => t("errorDeleteJournalEntry")),
  minRole: "member",
});

// ============================================================================
// FISCAL YEARS
// ============================================================================

export const createFiscalYearAction = createAction<
  unknown,
  Awaited<ReturnType<typeof createFiscalYear>>
>({
  handler: async (input, { companyId, db }) => {
    const parsed = createFiscalYearSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createFiscalYear(db, companyId, parsed.data);
  },
  revalidate: ["/accounting/fiscal-years"],
  errorMessage: () =>
    getTranslations("accounting").then((t) => t("errorCreateFiscalYear")),
  minRole: "admin",
});

export const closeFiscalPeriodAction = createAction<
  string,
  Awaited<ReturnType<typeof closeFiscalPeriod>>
>({
  handler: async (periodId, { companyId, db }) => {
    return closeFiscalPeriod(db, companyId, periodId);
  },
  revalidate: ["/accounting/fiscal-years"],
  errorMessage: () =>
    getTranslations("accounting").then((t) => t("errorClosePeriod")),
  minRole: "admin",
});

export const closeFiscalYearAction = createAction<
  string,
  Awaited<ReturnType<typeof closeFiscalYear>>
>({
  handler: async (yearId, { companyId, userId, db }) => {
    return closeFiscalYear(db, companyId, yearId, userId);
  },
  revalidate: ["/accounting/fiscal-years"],
  errorMessage: () =>
    getTranslations("accounting").then((t) => t("errorCloseFiscalYear")),
  minRole: "admin",
});
