'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  createWarehouse,
  updateWarehouse,
  createStockMovement,
  createSerialNumber,
  updateSerialNumberStatus,
  createWarehouseSchema,
  createStockMovementSchema,
  createSerialNumberSchema,
} from '@kivvi/core';
import { type ActionResult, getSession, safeErrorMessage } from './utils';
import { createAction } from './action-factory';

// ============================================================================
// WAREHOUSES
// ============================================================================

export const createWarehouseAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createWarehouseSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || 'Invalid input');
    return createWarehouse(db, companyId, parsed.data);
  },
  revalidate: ['/inventory'],
  errorMessage: 'Failed to create warehouse',
});

export async function updateWarehouseAction(
  warehouseId: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = createWarehouseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const warehouse = await updateWarehouse(db, companyId, warehouseId, parsed.data);
    revalidatePath('/inventory');
    return { success: true, data: warehouse };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update warehouse') };
  }
}

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

export const createStockMovementAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createStockMovementSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || 'Invalid input');
    return createStockMovement(db, companyId, parsed.data);
  },
  revalidate: ['/inventory'],
  errorMessage: 'Failed to create stock movement',
});

// ============================================================================
// SERIAL NUMBERS
// ============================================================================

export const createSerialNumberAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createSerialNumberSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || 'Invalid input');
    return createSerialNumber(db, companyId, parsed.data);
  },
  revalidate: ['/inventory'],
  errorMessage: 'Failed to create serial number',
});

export async function updateSerialNumberStatusAction(
  serialNumberId: string,
  status: 'available' | 'sold' | 'reserved' | 'defective',
  soldToContactId?: string
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const serial = await updateSerialNumberStatus(db, companyId, serialNumberId, status, soldToContactId);
    revalidatePath('/inventory');
    return { success: true, data: serial };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update serial number') };
  }
}
