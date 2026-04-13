import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApi, apiError, apiSuccess } from "@/lib/api-handler";
import {
  getInventoryItem,
  updateInventoryItem,
  updateItemStatus,
  updateInventoryItemSchema,
} from "@kivvi/core/src/domain/inventory-items";
import { ITEM_STATUS_VALUES } from "@kivvi/database/src/enums";

const patchSchema = updateInventoryItemSchema.extend({
  // Allow status transitions via PATCH — validated against allowed transitions in domain
  status: z.enum(ITEM_STATUS_VALUES).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const item = await getInventoryItem(db, ctx.companyId, params.id);
    if (!item) return apiError("Inventory item not found", 404);

    return apiSuccess(item);
  } catch {
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await authenticateApi(request, "member");
    if (ctx instanceof Response) return ctx;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        `Invalid body: ${parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join(", ")}`,
        400,
      );
    }

    const { status, ...fields } = parsed.data;

    // Status transitions go through the domain guard (validates allowed transitions)
    if (status) {
      await updateItemStatus(db, ctx.companyId, params.id, status);
    }

    // Update other fields if any were provided
    const hasOtherFields = Object.keys(fields).length > 0;
    const updated = hasOtherFields
      ? await updateInventoryItem(db, ctx.companyId, params.id, fields)
      : await getInventoryItem(db, ctx.companyId, params.id);

    if (!updated) return apiError("Inventory item not found", 404);

    return apiSuccess(updated);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update inventory item";
    return apiError(message, 400);
  }
}
