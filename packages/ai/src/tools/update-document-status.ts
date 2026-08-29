import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const TYPE_BASE_PATHS: Record<string, string> = {
  invoice: "/sales/invoices",
  quote: "/sales/quotes",
  order: "/sales/orders",
  order_confirmation: "/sales/orders",
  delivery_note: "/sales/delivery-notes",
  credit_note: "/sales/credit-notes",
  purchase_order: "/purchasing/purchase-orders",
  purchase_invoice: "/purchasing/purchase-invoices",
  dunning: "/sales/dunning",
  intake: "/intake",
  repair_order: "/repairs",
};

const updateDocumentStatusSchema = z.object({
  documentId: z.string().uuid().describe("The UUID of the document to update"),
  newStatus: z
    .enum([
      "draft",
      "sent",
      "confirmed",
      "delivered",
      "paid",
      "partially_paid",
      "overdue",
      "cancelled",
      "dunning_1",
      "dunning_2",
      "dunning_3",
    ])
    .describe("The new status for the document"),
});

export const updateDocumentStatusTool: Tool = {
  name: "update_document_status",
  description: `Update the status of a document (invoice, quote, order, etc.). Validates that the status transition is allowed. For example: draft → sent, sent → paid. Terminal statuses (paid, cancelled) cannot be changed.`,
  parameters: updateDocumentStatusSchema,
  requiredPermissions: ["invoice:write"],
  execute: async (
    params: z.infer<typeof updateDocumentStatusSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { updateDocumentStatus, getDocument } = await import("@kivvi/core");

      const db = getDb(context);

      // Get the document before update to capture previous status
      const docBefore = await getDocument(db, context.companyId, params.documentId);

      if (!docBefore) {
        return {
          success: false,
          error: "Document not found or you do not have access to it.",
        };
      }

      const previousStatus = docBefore.status;

      // Domain function handles: transition validation, paidDate, auto journal entries
      const updated = await updateDocumentStatus(
        db,
        context.companyId,
        params.documentId,
        params.newStatus,
      );

      // Fetch full document with contact info for the response
      const fullDoc = await getDocument(db, context.companyId, updated.id);

      return {
        success: true,
        message: `Updated ${updated.number} status from "${previousStatus}" to "${params.newStatus}".`,
        data: {
          id: updated.id,
          number: updated.number,
          type: updated.type,
          previousStatus,
          newStatus: updated.status,
          customer: fullDoc?.contact?.name || "Unknown",
          total: `${updated.currency} ${Number(updated.total).toFixed(2)}`,
          paidDate: updated.paidDate?.toISOString().split("T")[0] || null,
        },
        actions: [
          {
            label: "View Document",
            action: "navigate",
            params: {
              url: `${TYPE_BASE_PATHS[updated.type] ?? "/sales"}/${updated.id}`,
            },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update document status: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
