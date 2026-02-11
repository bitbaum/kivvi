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

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

export async function createAccountAction(input: unknown): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = createAccountSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const account = await createAccount(db, companyId, parsed.data);
    revalidatePath('/accounting');
    return { success: true, data: account };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to create account') };
  }
}

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

export async function toggleAccountAction(accountId: string): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const account = await toggleAccount(db, companyId, accountId);
    revalidatePath('/accounting');
    return { success: true, data: account };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to toggle account') };
  }
}

export async function seedChartOfAccountsAction(): Promise<ActionResult<{ count: number }>> {
  try {
    const { companyId } = await getSession();
    const count = await seedChartOfAccounts(db, companyId);
    revalidatePath('/accounting');
    return { success: true, data: { count } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to seed accounts') };
  }
}

// ============================================================================
// JOURNAL ENTRIES
// ============================================================================

export async function createJournalEntryAction(input: unknown): Promise<ActionResult> {
  try {
    const { companyId, userId } = await getSession();
    const parsed = createJournalEntrySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const entry = await db.transaction(async (tx) => {
      return createJournalEntry(tx, companyId, userId, parsed.data);
    });
    revalidatePath('/accounting/journal');
    return { success: true, data: entry };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to create journal entry') };
  }
}

export async function deleteJournalEntryAction(entryId: string): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    await deleteJournalEntry(db, companyId, entryId);
    revalidatePath('/accounting/journal');
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to delete journal entry') };
  }
}

// ============================================================================
// FISCAL YEARS
// ============================================================================

export async function createFiscalYearAction(input: unknown): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = createFiscalYearSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const year = await db.transaction(async (tx) => {
      return createFiscalYear(tx, companyId, parsed.data);
    });
    revalidatePath('/accounting/fiscal-years');
    return { success: true, data: year };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to create fiscal year') };
  }
}

export async function closeFiscalPeriodAction(periodId: string): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const period = await closeFiscalPeriod(db, companyId, periodId);
    revalidatePath('/accounting/fiscal-years');
    return { success: true, data: period };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to close period') };
  }
}

export async function closeFiscalYearAction(yearId: string): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const year = await db.transaction(async (tx) => {
      return closeFiscalYear(tx, companyId, yearId);
    });
    revalidatePath('/accounting/fiscal-years');
    return { success: true, data: year };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to close fiscal year') };
  }
}
