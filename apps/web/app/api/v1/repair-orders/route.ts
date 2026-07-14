import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  authenticateApi,
  apiError,
  apiSuccess,
  apiZodError,
} from "@/lib/api-handler";
import { withIdempotency } from "@/lib/api-idempotency";
import {
  createRepairOrder,
  createRepairOrderSchema,
} from "@kivvi/core/src/domain/repairs";

/**
 * POST /api/v1/repair-orders
 *
 * Record a repair on a customer-owned device as a `repair_order` document. The
 * device is a bailment — NEVER inventory (no stock movement, spec §5.1). Both
 * front-ends use this; revamp-it passes `source`/`sourceId` so the natural key
 * `repair:{source}:{sourceId}` makes replays converge to one repair.
 *
 * Recommended header: `Idempotency-Key: repair:{source}:{sourceId}`.
 */
export async function POST(request: NextRequest) {
  const ctx = await authenticateApi(request, "member");
  if (ctx instanceof Response) return ctx;

  return withIdempotency(request, ctx.companyId, async () => {
    try {
      const body = await request.json();
      const parsed = createRepairOrderSchema.safeParse(body);
      if (!parsed.success) return apiZodError(parsed.error, "body");

      const result = await createRepairOrder(
        db,
        ctx.companyId,
        ctx.userId,
        parsed.data,
      );
      return apiSuccess(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create repair order";
      return apiError(message, 400);
    }
  });
}
