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

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export async function createBankAccountAction(input: unknown): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = createBankAccountSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const account = await createBankAccount(db, companyId, parsed.data);
    revalidatePath('/banking');
    return { success: true, data: account };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to create bank account') };
  }
}

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
    const result = await db.transaction(async (tx) => {
      return importTransactions(tx, companyId, bankAccountId, parsed.data);
    });
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
    const txn = await db.transaction(async (tx) => {
      return reconcileTransaction(tx, companyId, transactionId, documentId);
    });
    revalidatePath('/banking');
    return { success: true, data: txn };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to reconcile transaction') };
  }
}

export async function unreconcileTransactionAction(
  transactionId: string
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const txn = await unreconcileTransaction(db, companyId, transactionId);
    revalidatePath('/banking');
    return { success: true, data: txn };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to unreconcile transaction') };
  }
}

export async function autoMatchTransactionsAction(
  bankAccountId: string
): Promise<ActionResult<{ matched: number }>> {
  try {
    const { companyId } = await getSession();
    const result = await db.transaction(async (tx) => {
      return autoMatchTransactions(tx, companyId, bankAccountId);
    });
    revalidatePath('/banking');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to auto-match') };
  }
}
