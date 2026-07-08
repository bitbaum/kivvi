import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  authenticateApi,
  apiError,
  apiSuccess,
  apiZodError,
} from "@/lib/api-handler";
import {
  createRepairLaborInvoice,
  createRepairLaborInvoiceSchema,
} from "@kivvi/core";

const bodySchema = createRepairLaborInvoiceSchema.omit({ itemId: true });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await authenticateApi(request, "member");
    if (ctx instanceof Response) return ctx;

    const { id: itemId } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiZodError(parsed.error, "body");
    }

    const doc = await db.transaction(async (tx) =>
      createRepairLaborInvoice(tx, ctx.companyId, ctx.userId, {
        itemId,
        ...parsed.data,
      }),
    );

    return apiSuccess({
      id: doc.id,
      number: doc.number,
      type: doc.type,
      status: doc.status,
      total: doc.total,
      currency: doc.currency,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create repair labor invoice";
    return apiError(message, 400);
  }
}
