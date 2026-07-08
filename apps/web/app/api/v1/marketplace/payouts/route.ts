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
  recordMarketplacePayout,
  recordMarketplacePayoutSchema,
} from "@kivvi/core/src/domain/accounting-integration";

/**
 * POST /api/v1/marketplace/payouts
 *
 * Settle a marketplace seller payable from the bank (Dr 2140 / Cr 1020).
 * Called by revamp-it when funds are released to the private seller.
 *
 * Idempotency-Key: `marketplace-order:{orderId}:payout` (recommended).
 */
export async function POST(request: NextRequest) {
  const ctx = await authenticateApi(request, "member");
  if (ctx instanceof Response) return ctx;

  return withIdempotency(request, ctx.companyId, async () => {
    try {
      const body = await request.json();
      const parsed = recordMarketplacePayoutSchema.safeParse(body);
      if (!parsed.success) {
        return apiZodError(parsed.error, "body");
      }

      const entry = await recordMarketplacePayout(
        db,
        ctx.companyId,
        parsed.data,
      );

      return apiSuccess({
        journalEntryId: entry.id,
        reference: entry.reference,
        sourceType: entry.sourceType,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to record payout";
      return apiError(message, 400);
    }
  });
}
