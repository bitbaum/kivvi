import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";

const classifyPaymentSchema = z.object({
  amount: z.string().describe("Amount as a decimal string; negative for an outflow/refund"),
  description: z.string().optional().describe("Bank memo / payment description, if any"),
  counterparty: z.string().optional().describe("Payer name / counterparty, if known"),
  matchedInvoiceId: z
    .string()
    .optional()
    .describe("UUID of an open invoice this money matches (use search_invoices first if unsure)"),
  isPassThrough: z
    .boolean()
    .optional()
    .describe("True if this is a facilitated P2P/agency settlement"),
});

export const classifyPaymentTool: Tool = {
  name: "classify_payment",
  description: `Triage an unclear money-in event into sale, donation, grant/subvention, refund, pass-through, or manual review. ADVISORY ONLY — it suggests a category and whether a human/Treuhänder must confirm; it never books anything. Use it when money arrives that doesn't obviously match an invoice.`,
  parameters: classifyPaymentSchema,
  requiredPermissions: ["banking:read"],
  execute: async (
    params: z.infer<typeof classifyPaymentSchema>,
    _context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { classifyMoneyIn } = await import("@kivvi/core");
      const result = classifyMoneyIn(params);

      return {
        success: true,
        message: `Suggested category: ${result.category} (${result.confidence} confidence). ${result.reason}${
          result.requiresReview ? " This requires human confirmation before booking." : ""
        }`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to classify payment: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
