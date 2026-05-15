import { z } from "zod";
import Decimal from "decimal.js";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const recordPaymentSchema = z.object({
  documentId: z
    .string()
    .uuid()
    .describe("The UUID of the invoice or document to record a payment for"),
  amount: z
    .string()
    .regex(
      /^\d+(\.\d+)?$/,
      'Amount must be a positive number string (e.g. "1500.00")',
    )
    .describe('The payment amount (e.g. "1500.00")'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional()
    .describe("Payment date in ISO format (YYYY-MM-DD). Defaults to today."),
  method: z
    .enum(["bank_transfer", "cash", "card", "other"])
    .optional()
    .describe("Payment method. Defaults to bank_transfer."),
  reference: z
    .string()
    .optional()
    .describe("Payment reference or transaction ID"),
});

export const recordPaymentTool: Tool = {
  name: "record_payment",
  description: `Record a payment on an invoice or other document. Supports bank transfer, cash, card, or other methods. Automatically updates the document status to "partially_paid" or "paid" based on the total amount paid.`,
  parameters: recordPaymentSchema,
  requiredPermissions: ["invoice:write"],
  execute: async (
    params: z.infer<typeof recordPaymentSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { recordPayment, getDocument } = await import("@kivvi/core");

      const db = getDb(context);

      const paymentDate = params.date || new Date().toISOString().split("T")[0];

      await recordPayment(db, context.companyId, params.documentId, {
        amount: params.amount,
        date: paymentDate,
        method: params.method,
        reference: params.reference,
      });

      // Fetch the updated document for the response
      const doc = await getDocument(db, context.companyId, params.documentId);

      if (!doc) {
        return {
          success: true,
          message: `Payment of ${params.amount} recorded successfully.`,
        };
      }

      const totalPaid = (doc.payments || []).reduce(
        (sum, p) => sum.plus(p.amount || "0"),
        new Decimal(0),
      );
      const docTotal = new Decimal(doc.total || "0");
      const remaining = docTotal.minus(totalPaid);

      return {
        success: true,
        message: `Payment of ${doc.currency} ${new Decimal(params.amount).toFixed(2)} recorded on ${doc.number}. Status: ${doc.status}. Remaining balance: ${doc.currency} ${remaining.toFixed(2)}.`,
        data: {
          id: doc.id,
          number: doc.number,
          type: doc.type,
          status: doc.status,
          paymentAmount: `${doc.currency} ${new Decimal(params.amount).toFixed(2)}`,
          totalPaid: `${doc.currency} ${totalPaid.toFixed(2)}`,
          total: `${doc.currency} ${docTotal.toFixed(2)}`,
          remaining: `${doc.currency} ${remaining.toFixed(2)}`,
          customer: doc.contact?.name || "Unknown",
          paymentDate,
          method: params.method || "bank_transfer",
          reference: params.reference || null,
        },
        actions: [
          {
            label: "View Document",
            action: "navigate",
            params: { url: `/sales/${doc.id}` },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to record payment: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
