'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { createDunning } from '@kivvi/core';
import { type ActionResult, getSession, safeErrorMessage } from './utils';

export async function createDunningAction(
  invoiceId: string
): Promise<ActionResult<{ id: string; number: string; newLevel: string }>> {
  try {
    const { companyId, userId } = await getSession();

    const { dunningDoc, newLevel } = await createDunning(db, companyId, userId, invoiceId);

    revalidatePath('/sales/dunning');
    revalidatePath('/sales/invoices');
    revalidatePath(`/sales/invoices/${invoiceId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      data: { id: dunningDoc.id, number: dunningDoc.number, newLevel },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to create dunning') };
  }
}
