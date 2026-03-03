'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
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
} from '@kivvi/core';
import { type ActionResult, getSession, safeErrorMessage } from './utils';
import { createAction } from './action-factory';

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

export const createAccountAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createAccountSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || 'Invalid input');
    return createAccount(db, companyId, parsed.data);
  },
  revalidate: ['/accounting'],
  errorMessage: 'Failed to create account',
});

export async function updateAccountAction(
  accountId: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = updateAccountSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const account = await updateAccount(db, companyId, accountId, parsed.data);
    revalidatePath('/accounting');
    return { success: true, data: account };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update account') };
  }
}

export const toggleAccountAction = createAction<string, unknown>({
  handler: async (accountId, { companyId, db }) => {
    return toggleAccount(db, companyId, accountId);
  },
  revalidate: ['/accounting'],
  errorMessage: 'Failed to toggle account',
});

export const seedChartOfAccountsAction = createAction<void, { count: number }>({
  handler: async (_input, { companyId, db }) => {
    const count = await seedChartOfAccounts(db, companyId);
    return { count };
  },
  revalidate: ['/accounting'],
  errorMessage: 'Failed to seed accounts',
});

// ============================================================================
// JOURNAL ENTRIES
// ============================================================================

export const createJournalEntryAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, userId, db }) => {
    const parsed = createJournalEntrySchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || 'Invalid input');
    return createJournalEntry(db, companyId, userId, parsed.data);
  },
  revalidate: ['/accounting/journal'],
  errorMessage: 'Failed to create journal entry',
});

export const deleteJournalEntryAction = createAction<string, void>({
  handler: async (entryId, { companyId, db }) => {
    await deleteJournalEntry(db, companyId, entryId);
  },
  revalidate: ['/accounting/journal'],
  errorMessage: 'Failed to delete journal entry',
});

// ============================================================================
// FISCAL YEARS
// ============================================================================

export const createFiscalYearAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createFiscalYearSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || 'Invalid input');
    return createFiscalYear(db, companyId, parsed.data);
  },
  revalidate: ['/accounting/fiscal-years'],
  errorMessage: 'Failed to create fiscal year',
});

export const closeFiscalPeriodAction = createAction<string, unknown>({
  handler: async (periodId, { companyId, db }) => {
    return closeFiscalPeriod(db, companyId, periodId);
  },
  revalidate: ['/accounting/fiscal-years'],
  errorMessage: 'Failed to close period',
});

export const closeFiscalYearAction = createAction<string, unknown>({
  handler: async (yearId, { companyId, db }) => {
    return closeFiscalYear(db, companyId, yearId);
  },
  revalidate: ['/accounting/fiscal-years'],
  errorMessage: 'Failed to close fiscal year',
});
