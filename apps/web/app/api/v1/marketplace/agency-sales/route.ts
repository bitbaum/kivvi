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
  recordMarketplaceAgencySale,
  recordMarketplaceAgencySaleSchema,
} from "@kivvi/core/src/domain/accounting-integration";

/**
 * POST /api/v1/marketplace/agency-sales
 *
 * Book a facilitated (P2P) marketplace sale — agency model only.
 * Called by revamp-it when a non-owned (`is_revampit=false`) secure sale is paid.
 * Never books full-price revenue; only commission + pass-through liability.
 *
 * Idempotency-Key: `marketplace-order:{orderId}:paid` (recommended).
 */
export async function POST(request: NextRequest) {
  const ctx = await authenticateApi(request, "member");
  if (ctx instanceof Response) return ctx;

  return withIdempotency(request, ctx.companyId, async () => {
    try {
      const body = await request.json();
      const parsed = recordMarketplaceAgencySaleSchema.safeParse(body);
      if (!parsed.success) {
        return apiZodError(parsed.error, "body");
      }

      const entry = await recordMarketplaceAgencySale(
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
        error instanceof Error ? error.message : "Failed to record agency sale";
      return apiError(message, 400);
    }
  });
}
