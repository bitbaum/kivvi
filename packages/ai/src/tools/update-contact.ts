import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const updateContactSchema = z.object({
  contactId: z.string().uuid().describe("The UUID of the contact to update"),
  name: z.string().min(1).optional().describe("Updated full name"),
  email: z.string().email().optional().describe("Updated email address"),
  phone: z.string().optional().describe("Updated phone number"),
  address: z.string().optional().describe("Updated street address"),
  city: z.string().optional().describe("Updated city"),
  postalCode: z.string().optional().describe("Updated postal code / ZIP"),
  notes: z.string().optional().describe("Updated internal notes"),
});

export const updateContactTool: Tool = {
  name: "update_contact",
  description: `Update an existing contact's information. Only the fields provided will be changed; other fields remain unchanged. Use search_customers first to find the contact ID.`,
  parameters: updateContactSchema,
  requiredPermissions: ["contact:write"],
  execute: async (
    params: z.infer<typeof updateContactSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { updateContact } = await import("@kivvi/core");
      const db = getDb(context);

      const { contactId, ...updateFields } = params;

      // Build update input, only including provided fields
      const input: Record<string, unknown> = {};
      if (updateFields.name !== undefined) input.name = updateFields.name;
      if (updateFields.email !== undefined) input.email = updateFields.email;
      if (updateFields.phone !== undefined) input.phone = updateFields.phone;
      if (updateFields.address !== undefined)
        input.address = updateFields.address;
      if (updateFields.city !== undefined) input.city = updateFields.city;
      if (updateFields.postalCode !== undefined)
        input.postalCode = updateFields.postalCode;
      if (updateFields.notes !== undefined) input.notes = updateFields.notes;

      const contact = await updateContact(
        db,
        context.companyId,
        contactId,
        input,
      );

      return {
        success: true,
        message: `Updated contact "${contact.name}" (${contact.contactNumber}).`,
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
        error: `Failed to update contact: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
