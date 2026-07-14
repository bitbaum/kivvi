import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authenticateApi, apiError, apiSuccess } from "@/lib/api-handler";
import { finalizeRepairInvoice } from "@kivvi/core/src/domain/repairs";

/**
 * POST /api/v1/repair-orders/{id}/finalize
 * Recognize service revenue, clear any advance, and book any subsidy receivable
 * in one balanced entry (config-driven VAT treatment). Marks the repair billed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await authenticateApi(request, "member");
  if (ctx instanceof Response) return ctx;

  try {
    const { id: documentId } = await params;
    const result = await finalizeRepairInvoice(db, ctx.companyId, {
      documentId,
    });
    return apiSuccess(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to finalize repair";
    return apiError(message, 400);
  }
}
