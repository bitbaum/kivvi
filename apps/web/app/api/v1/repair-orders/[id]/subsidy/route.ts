import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  authenticateApi,
  apiError,
  apiSuccess,
  apiZodError,
} from "@/lib/api-handler";
import {
  applySubsidy,
  applySubsidySchema,
} from "@kivvi/core/src/domain/repairs";

const bodySchema = applySubsidySchema.omit({ documentId: true });

/**
 * POST /api/v1/repair-orders/{id}/subsidy
 * Validate a subsidy code (program/category/cap) and record a subsidyClaims row.
 * An ineligible code is recorded `rejected` — the repair still bills full price.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await authenticateApi(request, "member");
  if (ctx instanceof Response) return ctx;

  try {
    const { id: documentId } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error, "body");

    const result = await applySubsidy(db, ctx.companyId, {
      documentId,
      ...parsed.data,
    });
    return apiSuccess(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to apply subsidy";
    return apiError(message, 400);
  }
}
