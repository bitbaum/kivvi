"use server";

import {
  createAccount,
  updateAccount,
  toggleAccount,
  createJournalEntry,
  deleteJournalEntry,
  reverseJournalEntry,
  createFiscalYear,
  closeFiscalPeriod,
  closeFiscalYear,
  seedChartOfAccounts,
  listAccounts,
  createAccountSchema,
  updateAccountSchema,
  createJournalEntrySchema,
  createFiscalYearSchema,
  recordConsignorPayout,
} from "@kivvi/core";
import type { Account } from "@kivvi/database";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

export const createAccountAction = createAction<unknown, Awaited<ReturnType<typeof createAccount>>>(
  {
    handler: async (input, { companyId, db }) => {
      const parsed = createAccountSchema.safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Invalid input");
      return createAccount(db, companyId, parsed.data);
    },
    revalidate: ["/accounting"],
    errorMessage: () => getTranslations("accounting").then((t) => t("errorCreateAccount")),
    minRole: "member",
    translateDomainErrors: true,
  },
);

export const updateAccountAction = createAction<
  { accountId: string; input: unknown },
  Awaited<ReturnType<typeof updateAccount>>
>({
  handler: async ({ accountId, input }, { companyId, db }) => {
    const parsed = updateAccountSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return updateAccount(db, companyId, accountId, parsed.data);
  },
  revalidate: ["/accounting"],
  errorMessage: () => getTranslations("accounting").then((t) => t("errorUpdateAccount")),
  minRole: "member",
  translateDomainErrors: true,
});

export const toggleAccountAction = createAction<string, Awaited<ReturnType<typeof toggleAccount>>>({
  handler: async (accountId, { companyId, db }) => {
    return toggleAccount(db, companyId, accountId);
  },
  revalidate: ["/accounting"],
  errorMessage: () => getTranslations("accounting").then((t) => t("errorToggleAccount")),
  minRole: "member",
});

export const seedChartOfAccountsAction = createAction<void, { count: number }>({
  handler: async (_input, { companyId, db }) => {
    const count = await seedChartOfAccounts(db, companyId);
    return { count };
  },
  revalidate: ["/accounting"],
  errorMessage: () => getTranslations("accounting").then((t) => t("errorSeedAccounts")),
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
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createJournalEntry(db, companyId, userId, parsed.data);
  },
  revalidate: ["/accounting/journal"],
  errorMessage: () => getTranslations("accounting").then((t) => t("errorCreateJournalEntry")),
  minRole: "member",
  translateDomainErrors: true,
});

export const deleteJournalEntryAction = createAction<string, void>({
  handler: async (entryId, { companyId, db }) => {
    await deleteJournalEntry(db, companyId, entryId);
  },
  revalidate: ["/accounting/journal"],
  errorMessage: () => getTranslations("accounting").then((t) => t("errorDeleteJournalEntry")),
  minRole: "member",
  translateDomainErrors: true,
});

/** GeBüV: a posted entry is corrected by a Storno counter-entry, not deleted. */
export const reverseJournalEntryAction = createAction<string, { id: string }>({
  handler: async (entryId, { companyId, userId, db }) => {
    const reversal = await reverseJournalEntry(db, companyId, entryId, {
      userId,
    });
    return { id: reversal.id };
  },
  revalidate: ["/accounting/journal"],
  errorMessage: () => getTranslations("accounting").then((t) => t("errorReverseJournalEntry")),
  minRole: "member",
  translateDomainErrors: true,
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
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createFiscalYear(db, companyId, parsed.data);
  },
  revalidate: ["/accounting/fiscal-years"],
  errorMessage: () => getTranslations("accounting").then((t) => t("errorCreateFiscalYear")),
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
  errorMessage: () => getTranslations("accounting").then((t) => t("errorClosePeriod")),
  minRole: "admin",
  translateDomainErrors: true,
});

export const closeFiscalYearAction = createAction<
  string,
  Awaited<ReturnType<typeof closeFiscalYear>>
>({
  handler: async (yearId, { companyId, userId, db }) => {
    return closeFiscalYear(db, companyId, yearId, userId);
  },
  revalidate: ["/accounting/fiscal-years"],
  errorMessage: () => getTranslations("accounting").then((t) => t("errorCloseFiscalYear")),
  minRole: "admin",
  translateDomainErrors: true,
});

export const listAccountsAction = createAction<{ isActive?: boolean } | void, Account[]>({
  handler: async (filters, { companyId, db }) =>
    listAccounts(db, companyId, filters ?? { isActive: true }),
  errorMessage: () => getTranslations("accounting").then((t) => t("errorLoadAccounts")),
});

// ============================================================================
// CONSIGNMENT
// ============================================================================

/**
 * Record a payout to a consignor, settling the accumulated payable from the
 * bank (Dr 2140 / Cr 1020). Validation lives in the domain layer.
 */
export const recordConsignorPayoutAction = createAction<
  unknown,
  Awaited<ReturnType<typeof recordConsignorPayout>>
>({
  handler: async (input, { companyId, db }) => recordConsignorPayout(db, companyId, input),
  revalidate: ["/accounting"],
  errorMessage: "Failed to record consignor payout",
  minRole: "admin",
  translateDomainErrors: true,
});
