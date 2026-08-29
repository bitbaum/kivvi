import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  authenticateApi,
  apiError,
  apiInternalError,
  apiSuccess,
  apiZodError,
} from "@/lib/api-handler";
import { withIdempotency } from "@/lib/api-idempotency";
import {
  getInventoryItem,
  updateInventoryItem,
  updateItemStatus,
  updateInventoryItemSchema,
  buildInventoryItemWebhookPayload,
} from "@kivvi/core/src/domain/inventory-items";
import { dispatchWebhookEvent } from "@kivvi/core/src/domain/webhooks";
import { ITEM_STATUS_VALUES } from "@kivvi/database/src/enums";

const patchSchema = updateInventoryItemSchema.extend({
  status: z.enum(ITEM_STATUS_VALUES).optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await authenticateApi(request);
    if (ctx instanceof Response) return ctx;

    const item = await getInventoryItem(db, ctx.companyId, params.id);
    if (!item) return apiError("Inventory item not found", 404);

    return apiSuccess(item);
  } catch {
    return apiInternalError();
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await authenticateApi(request, "member");
    if (ctx instanceof Response) return ctx;

    return withIdempotency(request, ctx.companyId, async () => {
      const body = await request.json();
      const parsed = patchSchema.safeParse(body);
      if (!parsed.success) {
        return apiZodError(parsed.error, "body");
      }

      const { status, ...fields } = parsed.data;
      const hasOtherFields = Object.keys(fields).length > 0;

      if (status) {
        await updateItemStatus(db, ctx.companyId, params.id, status, undefined, {
          skipWebhook: true,
        });
      }

      const updated = hasOtherFields
        ? await updateInventoryItem(db, ctx.companyId, params.id, fields, {
            skipWebhook: true,
          })
        : await getInventoryItem(db, ctx.companyId, params.id);

      if (!updated) return apiError("Inventory item not found", 404);

      if (status || hasOtherFields) {
        const event = status ? "inventory_item.status_changed" : "inventory_item.updated";
        await dispatchWebhookEvent(
          db,
          ctx.companyId,
          event,
          buildInventoryItemWebhookPayload(updated),
        );
      }

      return apiSuccess(updated);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update inventory item";
    return apiError(message, 400);
  }
}
