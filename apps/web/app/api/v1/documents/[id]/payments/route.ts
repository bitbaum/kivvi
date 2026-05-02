import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  authenticateApi,
  apiError,
  apiSuccess,
  apiZodError,
} from "@/lib/api-handler";
import { recordPayment } from "@kivvi/core";
import { PAYMENT_METHOD_VALUES } from "@kivvi/database/src/enums";

const recordPaymentSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a decimal string"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  method: z.enum(PAYMENT_METHOD_VALUES).optional().default("bank_transfer"),
  reference: z.string().max(200).optional(),
});

/**
 * POST /api/v1/documents/:id/payments
 *
 * Record a payment against an invoice. The document must be in a payable
 * status (sent / partially_paid). Use this after creating an invoice and
 * marking it sent to close the accounting loop from external systems (e.g.
 * RevampIT Payrexx webhook).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await authenticateApi(request, "member");
    if (ctx instanceof Response) return ctx;

    const { id } = await params;
    const body = await request.json();

    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return apiZodError(parsed.error, "body");
    }

    const payment = await recordPayment(db, ctx.companyId, id, parsed.data);
    return apiSuccess(payment);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record payment";
    return apiError(message, 400);
  }
}
