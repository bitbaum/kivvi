import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authenticateApi, apiError, apiSuccess, apiZodError } from "@/lib/api-handler";
import { recordRepairAdvance, recordRepairAdvanceSchema } from "@kivvi/core/src/domain/repairs";

const bodySchema = recordRepairAdvanceSchema.omit({ documentId: true });

/**
 * POST /api/v1/repair-orders/{id}/advance
 * Book an intake deposit as a liability (Dr Bank / Cr 2030 Erhaltene Anzahlungen).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApi(request, "member");
  if (ctx instanceof Response) return ctx;

  try {
    const { id: documentId } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error, "body");

    const result = await recordRepairAdvance(db, ctx.companyId, ctx.userId, {
      documentId,
      ...parsed.data,
    });
    return apiSuccess(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record advance";
    return apiError(message, 400);
  }
}
