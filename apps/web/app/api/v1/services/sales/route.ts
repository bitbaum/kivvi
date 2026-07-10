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
  recordServiceSale,
  recordServiceSaleSchema,
} from "@kivvi/core/src/domain/service-sales";

/**
 * POST /api/v1/services/sales
 *
 * Bridge a PAID revamp-it service flow (workshop, appointment, IT-Hilfe, or any
 * manually-settled service) into Kivvi as one service invoice + one payment,
 * routed to service revenue (3200). revamp-it keeps the workflow; Kivvi only
 * accounts for the money outcome.
 *
 * Idempotent twice over: the natural key `service-sale:{source}:{sourceId}` is
 * stored on the invoice (durable), and the standard `Idempotency-Key` header is
 * honoured for gateway retries. Recommended header:
 *   `Idempotency-Key: service-sale:{source}:{sourceId}`
 */
export async function POST(request: NextRequest) {
  const ctx = await authenticateApi(request, "member");
  if (ctx instanceof Response) return ctx;

  return withIdempotency(request, ctx.companyId, async () => {
    try {
      const body = await request.json();
      const parsed = recordServiceSaleSchema.safeParse(body);
      if (!parsed.success) {
        return apiZodError(parsed.error, "body");
      }

      const result = await recordServiceSale(
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
          : "Failed to record service sale";
      return apiError(message, 400);
    }
  });
}
