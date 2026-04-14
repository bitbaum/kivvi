"use server";

import { db } from "@/lib/db";
import {
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  createStockMovement,
  transferStock,
  createSerialNumber,
  updateSerialNumberStatus,
  createWarehouseSchema,
  createStockMovementSchema,
  transferStockSchema,
  createSerialNumberSchema,
} from "@kivvi/core";
import { createAction } from "./action-factory";

// ============================================================================
// WAREHOUSES
// ============================================================================

export const createWarehouseAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createWarehouseSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createWarehouse(db, companyId, parsed.data);
  },
  revalidate: ["/inventory"],
  errorMessage: "Failed to create warehouse",
  minRole: "member",
});

export const updateWarehouseAction = createAction<
  { warehouseId: string; input: unknown },
  unknown
>({
  handler: async ({ warehouseId, input }, { companyId, db }) => {
    const parsed = createWarehouseSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return updateWarehouse(db, companyId, warehouseId, parsed.data);
  },
  revalidate: ["/inventory"],
  errorMessage: "Failed to update warehouse",
  minRole: "member",
});

export const deleteWarehouseAction = createAction<string, void>({
  handler: async (warehouseId, { companyId, db }) => {
    await deleteWarehouse(db, companyId, warehouseId);
  },
  revalidate: ["/inventory"],
  errorMessage: "Failed to delete warehouse",
  minRole: "admin",
});

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

export const createStockMovementAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createStockMovementSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createStockMovement(db, companyId, parsed.data);
  },
  revalidate: ["/inventory"],
  errorMessage: "Failed to create stock movement",
  minRole: "member",
});

export const transferStockAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = transferStockSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return transferStock(db, companyId, parsed.data);
  },
  revalidate: ["/inventory"],
  errorMessage: "Failed to transfer stock",
  minRole: "member",
});

// ============================================================================
// SERIAL NUMBERS
// ============================================================================

export const createSerialNumberAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = createSerialNumberSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createSerialNumber(db, companyId, parsed.data);
  },
  revalidate: ["/inventory"],
  errorMessage: "Failed to create serial number",
  minRole: "member",
});

export const updateSerialNumberStatusAction = createAction<
  {
    serialNumberId: string;
    status: "available" | "sold" | "reserved" | "defective";
    soldToContactId?: string;
  },
  unknown
>({
  handler: async ({ serialNumberId, status, soldToContactId }, { companyId, db }) => {
    return updateSerialNumberStatus(db, companyId, serialNumberId, status, soldToContactId);
  },
  revalidate: ["/inventory"],
  errorMessage: "Failed to update serial number",
  minRole: "member",
});
