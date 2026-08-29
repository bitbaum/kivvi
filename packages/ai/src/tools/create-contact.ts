import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const createContactSchema = z.object({
  name: z.string().min(1).describe("Full name of the contact (company or person)"),
  type: z
    .enum(["customer", "vendor", "both"])
    .default("customer")
    .describe("Contact type: customer, vendor, or both"),
  email: z.string().email().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  address: z.string().optional().describe("Street address"),
  city: z.string().optional().describe("City"),
  postalCode: z.string().optional().describe("Postal code / ZIP"),
  country: z.string().default("CH").describe("Country code (default: CH for Switzerland)"),
  vatNumber: z.string().optional().describe("VAT registration number (e.g. CHE-123.456.789 MWST)"),
  notes: z.string().optional().describe("Internal notes about this contact"),
});

export const createContactTool: Tool = {
  name: "create_contact",
  description: `Create a new customer, vendor, or dual-type contact. Automatically generates a contact number (K-00001 format). The contact can then be used on documents like invoices, quotes, and orders.`,
  parameters: createContactSchema,
  requiredPermissions: ["contact:write"],
  execute: async (
    params: z.infer<typeof createContactSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { createContact } = await import("@kivvi/core");
      const db = getDb(context);

      const contact = await createContact(db, context.companyId, {
        type: params.type,
        name: params.name,
        email: params.email || null,
        phone: params.phone || null,
        address: params.address || null,
        city: params.city || null,
        postalCode: params.postalCode || null,
        country: params.country,
        vatNumber: params.vatNumber || null,
        notes: params.notes || null,
      });

      const typeLabels: Record<string, string> = {
        customer: "Customer",
        vendor: "Vendor",
        both: "Customer & Vendor",
      };

      return {
        success: true,
        message: `Created ${typeLabels[contact.type]} "${contact.name}" with number ${contact.contactNumber}.`,
        data: {
          id: contact.id,
          contactNumber: contact.contactNumber,
          name: contact.name,
          type: contact.type,
          email: contact.email,
          phone: contact.phone,
          city: contact.city,
        },
        actions: [
          {
            label: "View Contact",
            action: "navigate",
            params: { url: `/contacts/${contact.id}` },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create contact: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
