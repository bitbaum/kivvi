import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";
import { DEFAULT_VAT_RATE } from "@kivvi/core/src/config/vat-rates";

const documentItemSchema = z.object({
  description: z.string().describe("Line item description"),
  quantity: z.number().positive().describe("Quantity"),
  unitPrice: z
    .number()
    .nonnegative()
    .describe("Unit price in the company default currency"),
  vatRate: z
    .number()
    .default(Number(DEFAULT_VAT_RATE))
    .describe("VAT rate as percentage (e.g. 8.1 for standard Swiss VAT)"),
  discount: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe("Discount percentage (0-100)"),
});

const createDocumentSchema = z.object({
  type: z
    .enum([
      "invoice",
      "quote",
      "order",
      "order_confirmation",
      "delivery_note",
      "credit_note",
      "purchase_order",
      "purchase_invoice",
    ])
    .describe("The type of document to create"),
  contactId: z
    .string()
    .uuid()
    .describe("The UUID of the customer/vendor contact"),
  items: z
    .array(documentItemSchema)
    .min(1)
    .describe("Line items for the document"),
  issueDate: z
    .string()
    .optional()
    .describe("Issue date (ISO 8601). Defaults to today."),
  dueDate: z
    .string()
    .optional()
    .describe(
      "Due date (ISO 8601). Defaults to issue date + contact payment terms.",
    ),
  notes: z
    .string()
    .optional()
    .describe("Notes or remarks to include on the document"),
});

export const createDocumentTool: Tool = {
  name: "create_document",
  description: `Create a new document (invoice, quote, order, credit note, etc.) with line items. The document is always created in draft status so the user can review before sending. Requires a contact ID and at least one line item.`,
  parameters: createDocumentSchema,
  requiredPermissions: ["invoice:write"],
  execute: async (
    params: z.infer<typeof createDocumentSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { createDocument, getDocument } = await import("@kivvi/core");

      const db = getDb(context);

      // Map tool params to CreateDocumentInput format (numbers → strings for domain function)
      const input = {
        type: params.type,
        contactId: params.contactId,
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        currency: context.defaultCurrency,
        notes: params.notes,
        items: params.items.map((item, index) => ({
          position: index,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          discount: String(item.discount),
          vatRate: String(item.vatRate),
        })),
      };

      const doc = await createDocument(
        db,
        context.companyId,
        context.userId,
        input,
      );

      // Fetch the full document with contact info for the response
      const fullDoc = await getDocument(db, context.companyId, doc.id);

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
        message: `Created ${typeLabels[params.type] || params.type} ${doc.number} as draft.`,
        data: {
          id: doc.id,
          number: doc.number,
          type: params.type,
          status: "draft",
          customer: fullDoc?.contact?.name || "Unknown",
          issueDate: doc.issueDate
            ? new Date(doc.issueDate).toISOString().split("T")[0]
            : null,
          dueDate: doc.dueDate
            ? new Date(doc.dueDate).toISOString().split("T")[0]
            : null,
          itemCount: params.items.length,
          subtotal: `${doc.currency} ${Number(doc.subtotal).toFixed(2)}`,
          vat: `${doc.currency} ${Number(doc.vatAmount).toFixed(2)}`,
          total: `${doc.currency} ${Number(doc.total).toFixed(2)}`,
        },
        actions: [
          {
            label: "View Document",
            action: "navigate",
            params: { url: `/sales/${doc.id}` },
            variant: "primary",
          },
          {
            label: "Edit Document",
            action: "navigate",
            params: { url: `/sales/${doc.id}/edit` },
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create document: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
