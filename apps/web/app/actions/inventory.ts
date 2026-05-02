"use server";

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
import { getTranslations } from "next-intl/server";

// ============================================================================
// WAREHOUSES
// ============================================================================

export const createWarehouseAction = createAction<
  unknown,
  Awaited<ReturnType<typeof createWarehouse>>
>({
  handler: async (input, { companyId, db }) => {
    const parsed = createWarehouseSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createWarehouse(db, companyId, parsed.data);
  },
  revalidate: ["/inventory"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorCreateWarehouse")),
  minRole: "member",
});

export const updateWarehouseAction = createAction<
  { warehouseId: string; input: unknown },
  Awaited<ReturnType<typeof updateWarehouse>>
>({
  handler: async ({ warehouseId, input }, { companyId, db }) => {
    const parsed = createWarehouseSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return updateWarehouse(db, companyId, warehouseId, parsed.data);
  },
  revalidate: ["/inventory"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorUpdateWarehouse")),
  minRole: "member",
});

export const deleteWarehouseAction = createAction<string, void>({
  handler: async (warehouseId, { companyId, db }) => {
    await deleteWarehouse(db, companyId, warehouseId);
  },
  revalidate: ["/inventory"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorDeleteWarehouse")),
  minRole: "admin",
});

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

export const createStockMovementAction = createAction<
  unknown,
  Awaited<ReturnType<typeof createStockMovement>>
>({
  handler: async (input, { companyId, db }) => {
    const parsed = createStockMovementSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createStockMovement(db, companyId, parsed.data);
  },
  revalidate: ["/inventory"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorCreateStockMovement")),
  minRole: "member",
});

export const transferStockAction = createAction<
  unknown,
  Awaited<ReturnType<typeof transferStock>>
>({
  handler: async (input, { companyId, db }) => {
    const parsed = transferStockSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return transferStock(db, companyId, parsed.data);
  },
  revalidate: ["/inventory"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorTransferStock")),
  minRole: "member",
});

// ============================================================================
// SERIAL NUMBERS
// ============================================================================

export const createSerialNumberAction = createAction<
  unknown,
  Awaited<ReturnType<typeof createSerialNumber>>
>({
  handler: async (input, { companyId, db }) => {
    const parsed = createSerialNumberSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return createSerialNumber(db, companyId, parsed.data);
  },
  revalidate: ["/inventory"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorCreateSerialNumber")),
  minRole: "member",
});

export const updateSerialNumberStatusAction = createAction<
  {
    serialNumberId: string;
    status: "available" | "sold" | "reserved" | "defective";
    soldToContactId?: string;
  },
  Awaited<ReturnType<typeof updateSerialNumberStatus>>
>({
  handler: async (
    { serialNumberId, status, soldToContactId },
    { companyId, db },
  ) => {
    return updateSerialNumberStatus(
      db,
      companyId,
      serialNumberId,
      status,
      soldToContactId,
    );
  },
  revalidate: ["/inventory"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorUpdateSerialNumber")),
  minRole: "member",
});
