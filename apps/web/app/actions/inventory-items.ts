"use server";

import { z } from "zod";
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
  recordChecklist,
  recordDataErasure,
  createInventoryItemSchema,
  updateInventoryItemSchema,
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
import { revalidatePath } from "next/cache";
import { dispatchWebhookEvent } from "@kivvi/core/src/domain/webhooks";

export async function createInventoryItemAction(
  input: unknown,
): Promise<ActionResult<{ id: string; itemNumber: string }>> {
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
      error: safeErrorMessage(error, "Failed to create inventory item"),
    };
  }
}

export async function updateInventoryItemAction(
  itemId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireRole("member");
    const parsed = updateInventoryItemSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const item = await db.transaction(async (tx) => {
      return updateInventoryItem(tx, companyId, itemId, parsed.data);
    });

    revalidatePath("/intake");
    return { success: true, data: { id: item.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update inventory item"),
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
    return { success: true, data: { id: item.id, status: item.status } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update status"),
    };
  }
}

const updateConditionSchema = z.object({
  condition: z.enum(ITEM_CONDITION_VALUES),
});

export async function updateItemConditionAction(
  itemId: string,
  input: unknown,
): Promise<ActionResult<{ id: string; condition: string }>> {
  try {
    const { companyId } = await requireRole("member");
    const parsed = updateConditionSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const item = await db.transaction(async (tx) => {
      return updateItemCondition(tx, companyId, itemId, parsed.data.condition);
    });

    revalidatePath("/intake");
    return { success: true, data: { id: item.id, condition: item.condition } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update condition"),
    };
  }
}

const bulkStatusSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
  newStatus: z.enum(ITEM_STATUS_VALUES),
});

export async function bulkUpdateItemStatusAction(
  input: unknown,
): Promise<ActionResult<{ succeeded: number; failed: number }>> {
  try {
    const { companyId } = await requireRole("member");
    const parsed = bulkStatusSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const result = await bulkUpdateStatus(
      db,
      companyId,
      parsed.data.itemIds,
      parsed.data.newStatus,
    );

    revalidatePath("/intake");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update items"),
    };
  }
}

const MAX_PHOTO_SIZE = 500 * 1024; // 500KB
const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadItemPhotoAction(
  itemId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { companyId } = await requireRole("member");

    const file = formData.get("photo") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" };
    }

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Use PNG, JPEG, or WebP.",
      };
    }

    if (file.size > MAX_PHOTO_SIZE) {
      return { success: false, error: "File too large. Maximum 500KB." };
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
      return { success: false, error: "Item not found" };
    }

    revalidatePath(`/intake/items/${itemId}`);
    revalidatePath("/intake/items");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to upload photo"),
    };
  }
}

export async function removeItemPhotoAction(
  itemId: string,
): Promise<ActionResult> {
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
      error: safeErrorMessage(error, "Failed to remove photo"),
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

export async function recordRepairAction(
  itemId: string,
  input: unknown,
): Promise<ActionResult<{ id: string; repairCost: string | null }>> {
  try {
    const { companyId } = await requireRole("member");
    const parsed = recordRepairSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const item = await db.transaction(async (tx) => {
      return recordRepair(tx, companyId, itemId, {
        cost: parsed.data.cost,
        hours: parsed.data.hours || undefined,
        note: parsed.data.note,
      });
    });

    revalidatePath(`/intake/items/${itemId}`);
    return {
      success: true,
      data: { id: item.id, repairCost: item.repairCost },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to record repair"),
    };
  }
}

const bulkConditionSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
  condition: z.enum(ITEM_CONDITION_VALUES),
});

export async function bulkUpdateItemConditionAction(
  input: unknown,
): Promise<ActionResult<{ succeeded: number; failed: number }>> {
  try {
    const { companyId } = await requireRole("member");
    const parsed = bulkConditionSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

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

    revalidatePath("/intake/items");
    return { success: true, data: { succeeded, failed } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update items"),
    };
  }
}

const bulkPriceSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
  askingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price"),
});

export async function bulkUpdateItemAskingPriceAction(
  input: unknown,
): Promise<ActionResult<{ succeeded: number; failed: number }>> {
  try {
    const { companyId } = await requireRole("member");
    const parsed = bulkPriceSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

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

    revalidatePath("/intake/items");
    return { success: true, data: { succeeded, failed } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update prices"),
    };
  }
}

const assignTechnicianSchema = z.object({
  assignedToUserId: z.string().uuid().nullable(),
});

export async function assignItemTechnicianAction(
  itemId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireRole("member");
    const parsed = assignTechnicianSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const item = await db.transaction(async (tx) => {
      return updateInventoryItem(tx, companyId, itemId, {
        assignedToUserId: parsed.data.assignedToUserId,
      });
    });

    revalidatePath("/intake/repair-queue");
    revalidatePath(`/intake/items/${itemId}`);
    return { success: true, data: { id: item.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to assign technician"),
    };
  }
}

export async function deleteInventoryItemAction(
  itemId: string,
): Promise<ActionResult<void>> {
  try {
    const { companyId } = await requireRole("member");
    await deleteInventoryItem(db, companyId, itemId);
    revalidatePath("/intake");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to delete item"),
    };
  }
}

export async function listInventoryItemsAction(options?: {
  status?: string;
  condition?: string;
  search?: string;
  warehouseId?: string;
  intakeDocumentId?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<Awaited<ReturnType<typeof listInventoryItems>>>> {
  try {
    const { companyId } = await requireRole("member");
    const result = await listInventoryItems(db, companyId, options);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to list items"),
    };
  }
}

export async function getInventoryItemAction(
  itemId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getInventoryItem>>>> {
  try {
    const { companyId } = await requireRole("member");
    const item = await getInventoryItem(db, companyId, itemId);
    if (!item) return { success: false, error: "Item not found" };
    return { success: true, data: item };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to get item"),
    };
  }
}

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

export async function recordChecklistAction(
  itemId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId, userId } = await requireRole("member");
    const parsed = checklistSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const item = await db.transaction(async (tx) => {
      return recordChecklist(tx, companyId, itemId, {
        ...parsed.data,
        completions: parsed.data.completions as ChecklistItemCompletion[],
        userId,
      });
    });

    revalidatePath(`/intake/items/${itemId}`);
    return { success: true, data: { id: item.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to record checklist"),
    };
  }
}

// ============================================================================
// DATA ERASURE
// ============================================================================

const dataErasureSchema = z.object({
  method: z.string().refine((m) => m in DATA_ERASURE_METHODS, {
    message: "Invalid erasure method",
  }),
  notes: z.string().max(500).optional(),
});

export async function recordDataErasureAction(
  itemId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId, userId } = await requireRole("member");
    const parsed = dataErasureSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, ...formatZodError(parsed.error) };

    const item = await db.transaction(async (tx) => {
      return recordDataErasure(tx, companyId, itemId, {
        ...parsed.data,
        userId,
      });
    });

    revalidatePath(`/intake/items/${itemId}`);
    return { success: true, data: { id: item.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to record erasure"),
    };
  }
}
