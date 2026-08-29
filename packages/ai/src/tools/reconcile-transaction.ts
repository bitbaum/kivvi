import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const reconcileTransactionSchema = z.object({
  transactionId: z.string().uuid().describe("The UUID of the bank transaction to reconcile"),
  documentId: z
    .string()
    .uuid()
    .describe("The UUID of the document (invoice, purchase invoice) to match this transaction to"),
});

export const reconcileTransactionTool: Tool = {
  name: "reconcile_transaction",
  description: `Reconcile a bank transaction with a document (invoice, purchase invoice, etc.). This marks the transaction as reconciled and automatically records a payment on the matched document. The document status will be updated to "partially_paid" or "paid" accordingly.`,
  parameters: reconcileTransactionSchema,
  requiredPermissions: ["banking:write"],
  execute: async (
    params: z.infer<typeof reconcileTransactionSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { reconcileTransaction } = await import("@kivvi/core");
      const db = getDb(context);

      const transaction = await reconcileTransaction(
        db,
        context.companyId,
        params.transactionId,
        params.documentId,
      );

      const currency = context.defaultCurrency;

      return {
        success: true,
        message: `Transaction reconciled with document. Payment of ${currency} ${Math.abs(Number(transaction.amount)).toFixed(2)} recorded.`,
        data: {
          transactionId: transaction.id,
          documentId: params.documentId,
          amount: `${currency} ${Math.abs(Number(transaction.amount)).toFixed(2)}`,
          date: transaction.date ? new Date(transaction.date).toISOString().split("T")[0] : null,
          description: transaction.description,
          reference: transaction.reference,
          isReconciled: transaction.isReconciled,
        },
        actions: [
          {
            label: "View Transactions",
            action: "navigate",
            params: { url: "/banking/transactions" },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to reconcile transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
