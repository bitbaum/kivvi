import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const convertDocumentSchema = z.object({
  documentId: z.string().uuid().describe("The UUID of the source document to convert"),
  targetType: z
    .enum([
      "quote",
      "order",
      "order_confirmation",
      "delivery_note",
      "invoice",
      "credit_note",
      "purchase_order",
      "purchase_invoice",
    ])
    .describe("The target document type to convert to"),
});

export const convertDocumentTool: Tool = {
  name: "convert_document",
  description: `Convert a document to a different type (e.g. quote to order, order to invoice). Creates a new document based on the source document, copying all items and relevant data. Valid conversions: quote → order/invoice, order → delivery_note/invoice, delivery_note → invoice, purchase_order → purchase_invoice.`,
  parameters: convertDocumentSchema,
  requiredPermissions: ["invoice:write"],
  execute: async (
    params: z.infer<typeof convertDocumentSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { convertDocument } = await import("@kivvi/core");

      const db = getDb(context);

      const newDoc = await convertDocument(
        db,
        context.companyId,
        context.userId,
        params.documentId,
        params.targetType,
      );

      const typeLabels: Record<string, string> = {
        invoice: "Invoice",
        quote: "Quote",
        order: "Order",
        order_confirmation: "Order Confirmation",
        delivery_note: "Delivery Note",
        credit_note: "Credit Note",
        purchase_order: "Purchase Order",
        purchase_invoice: "Purchase Invoice",
      };

      return {
        success: true,
        message: `Converted document to ${typeLabels[newDoc.type] || newDoc.type} ${newDoc.number}.`,
        data: {
          id: newDoc.id,
          number: newDoc.number,
          type: newDoc.type,
        },
        actions: [
          {
            label: "View New Document",
            action: "navigate",
            params: { url: `/sales/${newDoc.id}` },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      if (message.includes("not found") || message.includes("Cannot convert")) {
        return {
          success: false,
          error: message,
        };
      }

      return {
        success: false,
        error: `Failed to convert document: ${message}`,
      };
    }
  },
};
