"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  createInventoryItem,
  updateInventoryItem,
  updateItemStatus,
  updateItemCondition,
  bulkUpdateStatus,
  deleteInventoryItem,
  listInventoryItems,
  getInventoryItem,
  recordRepair,
  addRepairPart,
  removeRepairPart,
  recordChecklist,
  recordDataErasure,
  createInventoryItemSchema,
  updateInventoryItemSchema,
  addRepairPartSchema,
} from "@kivvi/core";
import { DATA_ERASURE_METHODS } from "@kivvi/core/src/config/checklist-templates";
import type { ChecklistItemCompletion } from "@kivvi/core/src/config/checklist-templates";
import {
  ITEM_STATUS_VALUES,
  ITEM_CONDITION_VALUES,
} from "@kivvi/database/src/enums";
import {
  type ActionResult,
  requireRole,
  safeErrorMessage,
  formatZodError,
} from "./utils";
import { createAction } from "./action-factory";
import { revalidatePath } from "next/cache";
import { dispatchWebhookEvent } from "@kivvi/core/src/domain/webhooks";
import { getTranslations } from "next-intl/server";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/config/uploads";

export async function createInventoryItemAction(
  input: unknown,
): Promise<ActionResult<{ id: string; itemNumber: string }>> {
  const t = await getTranslations("inventory");
  try {
    const { companyId } = await requireRole("member");
    const parsed = createInventoryItemSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const item = await db.transaction(async (tx) => {
      return createInventoryItem(tx, companyId, parsed.data);
    });

    // Non-blocking: fire webhook event so connected systems (RevampIT, etc.) know
    dispatchWebhookEvent(db, companyId, "inventory_item.created", {
      id: item.id,
      itemNumber: item.itemNumber,
      description: item.description,
      condition: item.condition,
      status: item.status,
      warehouseId: item.warehouseId,
      askingPrice: item.askingPrice,
    }).catch(() => {});

    revalidatePath("/intake");
    return {
      success: true,
      data: { id: item.id, itemNumber: item.itemNumber },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToCreate")),
    };
  }
}

export async function updateInventoryItemAction(
  itemId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("inventory");
  try {
    const { companyId } = await requireRole("member");
    const parsed = updateInventoryItemSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const item = await db.transaction(async (tx) => {
      return updateInventoryItem(tx, companyId, itemId, parsed.data);
    });

    dispatchWebhookEvent(db, companyId, "inventory_item.updated", {
      id: item.id,
      itemNumber: item.itemNumber,
      description: item.description,
      condition: item.condition,
      status: item.status,
      warehouseId: item.warehouseId,
      askingPrice: item.askingPrice,
    }).catch(() => {});

    revalidatePath("/intake");
    revalidatePath(`/intake/items/${itemId}`);
    revalidatePath("/intake/items");
    return { success: true, data: { id: item.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToUpdate")),
    };
  }
}

const updateStatusSchema = z.object({
  newStatus: z.enum(ITEM_STATUS_VALUES),
});

export async function updateItemStatusAction(
  itemId: string,
  input: unknown,
): Promise<ActionResult<{ id: string; status: string }>> {
  const [t, tDomain] = await Promise.all([
    getTranslations("inventory"),
    getTranslations("domainErrors"),
  ]);
  try {
    const { companyId, userId } = await requireRole("member");
    const parsed = updateStatusSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const item = await db.transaction(async (tx) => {
      return updateItemStatus(
        tx,
        companyId,
        itemId,
        parsed.data.newStatus,
        userId,
      );
    });

    dispatchWebhookEvent(db, companyId, "inventory_item.status_changed", {
      id: item.id,
      itemNumber: item.itemNumber,
      status: item.status,
    }).catch(() => {});

    revalidatePath("/intake");
    revalidatePath("/intake/items");
    revalidatePath(`/intake/items/${itemId}`);
    revalidatePath("/intake/repair-queue");
    return { success: true, data: { id: item.id, status: item.status } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(
        error,
        t("errorFailedToUpdateStatus"),
        (code, params) =>
          tDomain(code as Parameters<typeof tDomain>[0], params),
      ),
    };
  }
}

const updateConditionSchema = z.object({
  condition: z.enum(ITEM_CONDITION_VALUES),
});

export const updateItemConditionAction = createAction<
  { itemId: string; input: unknown },
  { id: string; condition: string }
>({
  handler: async ({ itemId, input }, { companyId, db }) => {
    const parsed = updateConditionSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const item = await db.transaction(async (tx) =>
      updateItemCondition(tx, companyId, itemId, parsed.data.condition),
    );
    revalidatePath(`/intake/items/${itemId}`);
    return { id: item.id, condition: item.condition };
  },
  revalidate: ["/intake"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToUpdateCondition")),
  minRole: "member",
});

const bulkStatusSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
  newStatus: z.enum(ITEM_STATUS_VALUES),
});

export const bulkUpdateItemStatusAction = createAction<
  unknown,
  { succeeded: number; failed: number }
>({
  handler: async (input, { companyId, db }) => {
    const parsed = bulkStatusSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    return bulkUpdateStatus(
      db,
      companyId,
      parsed.data.itemIds,
      parsed.data.newStatus,
    );
  },
  revalidate: ["/intake"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToUpdateItems")),
  minRole: "member",
});

const MAX_PHOTO_SIZE = MAX_UPLOAD_SIZE_BYTES;
const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadItemPhotoAction(
  itemId: string,
  formData: FormData,
): Promise<ActionResult> {
  const t = await getTranslations("inventory");
  try {
    const { companyId } = await requireRole("member");

    const file = formData.get("photo") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: t("errorNoFileProvided") };
    }

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return { success: false, error: t("errorInvalidFileType") };
    }

    if (file.size > MAX_PHOTO_SIZE) {
      return { success: false, error: t("errorFileTooLarge") };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const { inventoryItems: inventoryItemsTable } =
      await import("@kivvi/database");
    const { eq, and } = await import("drizzle-orm");

    const result = await db
      .update(inventoryItemsTable)
      .set({
        photoBase64: base64,
        photoMimeType: file.type,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItemsTable.id, itemId),
          eq(inventoryItemsTable.companyId, companyId),
        ),
      )
      .returning({ id: inventoryItemsTable.id });

    if (result.length === 0) {
      return { success: false, error: t("errorItemNotFound") };
    }

    revalidatePath(`/intake/items/${itemId}`);
    revalidatePath("/intake/items");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToUploadPhoto")),
    };
  }
}

export async function removeItemPhotoAction(
  itemId: string,
): Promise<ActionResult> {
  const t = await getTranslations("inventory");
  try {
    const { companyId } = await requireRole("member");
    const { inventoryItems: inventoryItemsTable } =
      await import("@kivvi/database");
    const { eq, and } = await import("drizzle-orm");

    await db
      .update(inventoryItemsTable)
      .set({
        photoBase64: null,
        photoMimeType: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItemsTable.id, itemId),
          eq(inventoryItemsTable.companyId, companyId),
        ),
      );

    revalidatePath(`/intake/items/${itemId}`);
    revalidatePath("/intake/items");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToRemovePhoto")),
    };
  }
}

const recordRepairSchema = z.object({
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid cost"),
  hours: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid hours")
    .optional()
    .or(z.literal("")),
  note: z.string().max(500).optional(),
});

export const recordRepairAction = createAction<
  { itemId: string; input: unknown },
  { id: string; repairCost: string | null }
>({
  handler: async ({ itemId, input }, { companyId, db }) => {
    const parsed = recordRepairSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const item = await db.transaction(async (tx) =>
      recordRepair(tx, companyId, itemId, {
        cost: parsed.data.cost,
        hours: parsed.data.hours || undefined,
        note: parsed.data.note,
      }),
    );
    revalidatePath(`/intake/items/${itemId}`);
    return { id: item.id, repairCost: item.repairCost };
  },
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToRecordRepair")),
  minRole: "member",
});

export const addRepairPartAction = createAction<
  { itemId: string; input: unknown },
  { id: string }
>({
  handler: async ({ itemId, input }, { companyId, userId, db }) => {
    const parsed = addRepairPartSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const part = await db.transaction(async (tx) =>
      addRepairPart(tx, companyId, itemId, parsed.data, userId),
    );
    revalidatePath(`/intake/items/${itemId}`);
    return { id: part.id };
  },
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToAddRepairPart")),
  minRole: "member",
});

export const removeRepairPartAction = createAction<
  { partId: string; itemId: string },
  void
>({
  handler: async ({ partId, itemId }, { companyId, db }) => {
    await db.transaction(async (tx) => removeRepairPart(tx, companyId, partId));
    revalidatePath(`/intake/items/${itemId}`);
  },
  errorMessage: () =>
    getTranslations("inventory").then((t) =>
      t("errorFailedToRemoveRepairPart"),
    ),
  minRole: "member",
});

const bulkConditionSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
  condition: z.enum(ITEM_CONDITION_VALUES),
});

export const bulkUpdateItemConditionAction = createAction<
  unknown,
  { succeeded: number; failed: number }
>({
  handler: async (input, { companyId, db }) => {
    const parsed = bulkConditionSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    let succeeded = 0;
    let failed = 0;
    for (const id of parsed.data.itemIds) {
      try {
        await updateItemCondition(db, companyId, id, parsed.data.condition);
        succeeded++;
      } catch {
        failed++;
      }
    }
    return { succeeded, failed };
  },
  revalidate: ["/intake/items"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToUpdateItems")),
  minRole: "member",
});

const bulkPriceSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
  askingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price"),
});

export const bulkUpdateItemAskingPriceAction = createAction<
  unknown,
  { succeeded: number; failed: number }
>({
  handler: async (input, { companyId, db }) => {
    const parsed = bulkPriceSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    let succeeded = 0;
    let failed = 0;
    for (const id of parsed.data.itemIds) {
      try {
        await updateInventoryItem(db, companyId, id, {
          askingPrice: parsed.data.askingPrice,
        });
        succeeded++;
      } catch {
        failed++;
      }
    }
    return { succeeded, failed };
  },
  revalidate: ["/intake/items"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToUpdatePrices")),
  minRole: "member",
});

const assignTechnicianSchema = z.object({
  assignedToUserId: z.string().uuid().nullable(),
});

export const assignItemTechnicianAction = createAction<
  { itemId: string; input: unknown },
  { id: string }
>({
  handler: async ({ itemId, input }, { companyId, db }) => {
    const parsed = assignTechnicianSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const item = await db.transaction(async (tx) =>
      updateInventoryItem(tx, companyId, itemId, {
        assignedToUserId: parsed.data.assignedToUserId,
      }),
    );
    revalidatePath(`/intake/items/${itemId}`);
    return { id: item.id };
  },
  revalidate: ["/intake/repair-queue"],
  errorMessage: () =>
    getTranslations("inventory").then((t) =>
      t("errorFailedToAssignTechnician"),
    ),
  minRole: "member",
});

export const deleteInventoryItemAction = createAction<string, void>({
  handler: async (itemId, { companyId, db }) => {
    await deleteInventoryItem(db, companyId, itemId);
  },
  revalidate: ["/intake"],
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToDelete")),
  minRole: "member",
});

export const listInventoryItemsAction = createAction<
  | {
      status?: string;
      condition?: string;
      search?: string;
      warehouseId?: string;
      intakeDocumentId?: string;
      page?: number;
      pageSize?: number;
    }
  | undefined,
  Awaited<ReturnType<typeof listInventoryItems>>
>({
  handler: async (options, { companyId, db }) =>
    listInventoryItems(db, companyId, options),
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToList")),
  minRole: "member",
});

export const getInventoryItemAction = createAction<
  string,
  NonNullable<Awaited<ReturnType<typeof getInventoryItem>>>
>({
  handler: async (itemId, { companyId, db }) => {
    const item = await getInventoryItem(db, companyId, itemId);
    if (!item) throw new Error("Item not found");
    return item;
  },
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToGet")),
  minRole: "member",
});

// ============================================================================
// CHECKLIST
// ============================================================================

const checklistSchema = z.object({
  category: z.string().min(1).max(50),
  completions: z.array(
    z.object({
      id: z.string().min(1).max(100),
      result: z.enum(["pass", "fail", "skip"]),
      value: z.string().optional(),
      skipReason: z.string().max(500).optional(),
      completedAt: z.string(),
      completedBy: z.string().uuid(),
    }),
  ),
});

export const recordChecklistAction = createAction<
  { itemId: string; input: unknown },
  { id: string }
>({
  handler: async ({ itemId, input }, { companyId, userId, db }) => {
    const parsed = checklistSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const item = await db.transaction(async (tx) =>
      recordChecklist(tx, companyId, itemId, {
        ...parsed.data,
        completions: parsed.data.completions as ChecklistItemCompletion[],
        userId,
      }),
    );
    revalidatePath(`/intake/items/${itemId}`);
    return { id: item.id };
  },
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToRecordChecklist")),
  minRole: "member",
});

// ============================================================================
// DATA ERASURE
// ============================================================================

const dataErasureSchema = z.object({
  method: z.string().refine((m) => m in DATA_ERASURE_METHODS, {
    message: "Invalid erasure method",
  }),
  notes: z.string().max(500).optional(),
});

export const recordDataErasureAction = createAction<
  { itemId: string; input: unknown },
  { id: string }
>({
  handler: async ({ itemId, input }, { companyId, userId, db }) => {
    const parsed = dataErasureSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const item = await db.transaction(async (tx) =>
      recordDataErasure(tx, companyId, itemId, { ...parsed.data, userId }),
    );
    revalidatePath(`/intake/items/${itemId}`);
    return { id: item.id };
  },
  errorMessage: () =>
    getTranslations("inventory").then((t) => t("errorFailedToRecordErasure")),
  minRole: "member",
});
