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

// ============================================================================
// WAREHOUSES
// ============================================================================

export async function createWarehouseAction(input: unknown): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = createWarehouseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const warehouse = await createWarehouse(db, companyId, parsed.data);
    revalidatePath('/inventory');
    return { success: true, data: warehouse };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to create warehouse') };
  }
}

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

export async function createStockMovementAction(input: unknown): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = createStockMovementSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const movement = await db.transaction(async (tx) => {
      return createStockMovement(tx, companyId, parsed.data);
    });
    revalidatePath('/inventory');
    return { success: true, data: movement };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to create stock movement') };
  }
}

// ============================================================================
// SERIAL NUMBERS
// ============================================================================

export async function createSerialNumberAction(input: unknown): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = createSerialNumberSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const serial = await createSerialNumber(db, companyId, parsed.data);
    revalidatePath('/inventory');
    return { success: true, data: serial };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to create serial number') };
  }
}

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
