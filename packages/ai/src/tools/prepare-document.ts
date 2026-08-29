import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";
import { DEFAULT_VAT_RATE } from "@kivvi/core/src/config/vat-rates";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import Decimal from "decimal.js";

const documentItemSchema = z.object({
  description: z.string().describe("Line item description"),
  quantity: z.number().positive().describe("Quantity"),
  unitPrice: z.number().nonnegative().describe("Unit price in the company default currency"),
  vatRate: z
    .number()
    .default(Number(DEFAULT_VAT_RATE))
    .describe("VAT rate as percentage (e.g. 8.1 for standard Swiss VAT)"),
  discount: z.number().min(0).max(100).default(0).describe("Discount percentage (0-100)"),
});

const prepareDocumentSchema = z.object({
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
      "intake",
    ])
    .describe(
      "The type of document to prepare. Use 'intake' for donations, trade-ins, and goods received for refurbishment.",
    ),
  contactId: z
    .string()
    .uuid()
    .optional()
    .describe("The UUID of the customer/vendor contact (if already known)"),
  contactName: z
    .string()
    .optional()
    .describe("Contact name to search for (used if contactId is not provided)"),
  items: z.array(documentItemSchema).min(1).describe("Line items for the document"),
  issueDate: z.string().optional().describe("Issue date (ISO 8601). Defaults to today."),
  dueDate: z.string().optional().describe("Due date (ISO 8601)."),
  notes: z.string().optional().describe("Notes or remarks to include on the document"),
});

/** Route prefixes per document type for navigation URLs */
const ROUTE_PREFIX: Record<string, string> = {
  invoice: "/sales/invoices",
  quote: "/sales/quotes",
  order: "/sales/orders",
  order_confirmation: "/sales/orders",
  delivery_note: "/sales/delivery-notes",
  credit_note: "/sales/credit-notes",
  purchase_order: "/purchasing/purchase-orders",
  purchase_invoice: "/purchasing/purchase-invoices",
  intake: "/intake",
};

const TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  quote: "Quote",
  order: "Order",
  order_confirmation: "Order Confirmation",
  delivery_note: "Delivery Note",
  credit_note: "Credit Note",
  purchase_order: "Purchase Order",
  purchase_invoice: "Purchase Invoice",
  intake: "Intake",
};

export const prepareDocumentTool: Tool = {
  name: "prepare_document",
  description: `Prepare a document for the user to review in a pre-filled form. Use this instead of create_document when the user describes what they want in natural language — it resolves contacts by name, computes totals, and returns a link to open the form pre-filled. The document is NOT created until the user submits the form. If the user provides a contact name instead of ID, this tool will search for a matching contact.`,
  parameters: prepareDocumentSchema,
  requiredPermissions: ["invoice:read", "contact:read"],
  execute: async (
    params: z.infer<typeof prepareDocumentSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const db = getDb(context);

      // Resolve contact
      let contactId = params.contactId;
      let contactName = params.contactName;

      if (!contactId && contactName) {
        const { listContacts } = await import("@kivvi/core");
        const result = await listContacts(db, context.companyId, {
          search: contactName,
          pageSize: 1,
        });
        if (result.data.length > 0) {
          contactId = result.data[0].id;
          contactName = result.data[0].name;
        } else {
          return {
            success: false,
            error: `No contact found matching "${contactName}". Please check the name or create the contact first.`,
            actions: [
              {
                label: "Create Contact",
                action: "navigate",
                params: { url: "/contacts/new" },
              },
            ],
          };
        }
      } else if (contactId && !contactName) {
        // Look up contact name for display
        const { getContact } = await import("@kivvi/core");
        const contactData = await getContact(db, context.companyId, contactId);
        if (contactData) contactName = contactData.contact.name;
      }

      // Calculate totals
      const currency = context.defaultCurrency || DEFAULT_CURRENCY;
      let subtotal = new Decimal(0);
      let vatTotal = new Decimal(0);

      for (const item of params.items) {
        const net = new Decimal(item.unitPrice)
          .times(item.quantity)
          .times(new Decimal(100).minus(item.discount).div(100));
        const vat = net.times(new Decimal(item.vatRate).div(100));
        subtotal = subtotal.plus(net);
        vatTotal = vatTotal.plus(vat);
      }

      const total = subtotal.plus(vatTotal);

      // Build prefill data
      const prefill = {
        contactId,
        contactName,
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        notes: params.notes,
        items: params.items.map((item) => ({
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          vatRate: String(item.vatRate),
          discount: String(item.discount),
        })),
      };

      const prefillEncoded = Buffer.from(JSON.stringify(prefill)).toString("base64url");
      const basePath = ROUTE_PREFIX[params.type] || "/sales/invoices";
      const url = `${basePath}/new?prefill=${prefillEncoded}`;
      const typeLabel = TYPE_LABELS[params.type] || params.type;

      return {
        success: true,
        message: `${typeLabel} for ${contactName || "unknown contact"} ready: ${currency} ${total.toDecimalPlaces(2).toString()} (${params.items.length} item${params.items.length > 1 ? "s" : ""})`,
        data: {
          type: params.type,
          contact: contactName,
          itemCount: params.items.length,
          subtotal: `${currency} ${subtotal.toDecimalPlaces(2).toString()}`,
          vat: `${currency} ${vatTotal.toDecimalPlaces(2).toString()}`,
          total: `${currency} ${total.toDecimalPlaces(2).toString()}`,
          items: params.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: new Decimal(item.unitPrice).times(item.quantity).toDecimalPlaces(2).toString(),
          })),
        },
        actions: [
          {
            label: "Open Form",
            action: "prefill_form",
            params: { url },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to prepare document: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
