'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  createBankAccount,
  updateBankAccount,
  importTransactions,
  reconcileTransaction,
  unreconcileTransaction,
  autoMatchTransactions,
  createBankAccountSchema,
  importTransactionSchema,
} from '@kivvi/core';
import { z } from 'zod';
import { type ActionResult, getSession, safeErrorMessage } from './utils';
import { createAction } from './action-factory';

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export const createBankAccountAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createBankAccountSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || 'Invalid input');
    return createBankAccount(db, companyId, parsed.data);
  },
  revalidate: ['/banking'],
  errorMessage: 'Failed to create bank account',
});

export async function updateBankAccountAction(
  bankAccountId: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = createBankAccountSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const account = await updateBankAccount(db, companyId, bankAccountId, parsed.data);
    revalidatePath('/banking');
    return { success: true, data: account };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update bank account') };
  }
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export async function importTransactionsAction(
  bankAccountId: string,
  transactions: unknown[]
): Promise<ActionResult<{ imported: number }>> {
  try {
    const { companyId } = await getSession();
    const parsed = z.array(importTransactionSchema).safeParse(transactions);
    if (!parsed.success) {
      return { success: false, error: 'Invalid transaction data' };
    }
    const result = await importTransactions(db, companyId, bankAccountId, parsed.data);
    revalidatePath('/banking');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to import transactions') };
  }
}

export async function reconcileTransactionAction(
  transactionId: string,
  documentId: string
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const txn = await reconcileTransaction(db, companyId, transactionId, documentId);
    revalidatePath('/banking');
    return { success: true, data: txn };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to reconcile transaction') };
  }
}

export const unreconcileTransactionAction = createAction<string, unknown>({
  handler: async (transactionId, { companyId, db }) => {
    return unreconcileTransaction(db, companyId, transactionId);
  },
  revalidate: ['/banking'],
  errorMessage: 'Failed to unreconcile transaction',
});

export const autoMatchTransactionsAction = createAction<string, { matched: number }>({
  handler: async (bankAccountId, { companyId, db }) => {
    return autoMatchTransactions(db, companyId, bankAccountId);
  },
  revalidate: ['/banking'],
  errorMessage: 'Failed to auto-match',
});
