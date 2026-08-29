import { z } from "zod";
import Decimal from "decimal.js";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb, resolveInventoryItem } from "./utils";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";

const updateInventoryItemSchema = z.object({
  item_identifier: z
    .string()
    .describe(
      "Item number (e.g. IT-00042) or item UUID. Use search_inventory to find the correct item.",
    ),
  description: z
    .string()
    .min(1)
    .max(500)
    .optional()
    .describe("New description for the item (e.g. 'ThinkPad T490 i5 16GB')."),
  serial_number: z.string().max(200).optional().describe("Device serial number (e.g. 'R90K3XPQ')."),
  location: z
    .string()
    .max(200)
    .optional()
    .describe("Physical shelf or bin location within the warehouse (e.g. 'A3-B2', 'Shelf 5')."),
  asking_price: z
    .number()
    .min(0)
    .optional()
    .describe("Asking/list price for this item in CHF. Set before listing for sale."),
  min_price: z
    .number()
    .min(0)
    .optional()
    .describe("Minimum acceptable sale price in CHF. Prevents selling below cost."),
  estimated_value: z
    .number()
    .min(0)
    .optional()
    .describe("Acquisition/estimated value in CHF. Used as cost basis for margin calculation."),
  notes: z
    .string()
    .max(5000)
    .optional()
    .describe("Free-text notes about the item (replaces existing notes if provided)."),
});

export const updateInventoryItemTool: Tool = {
  name: "update_inventory_item",
  description: `Update fields on an inventory item: description, serial number, warehouse location, asking price, minimum price, acquisition value, or notes. Only the fields you provide are changed — others stay the same.

Examples:
- "Set the serial number of IT-00042 to R90K3XPQ"
- "Price IT-00117 at CHF 299 (min CHF 250)"
- "Move IT-00089 to shelf A3"
- "Add a note to IT-00055: 'missing one key cap'"
- "Set the asking price of IT-00031 to CHF 149"`,
  parameters: updateInventoryItemSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof updateInventoryItemSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { updateInventoryItem } = await import("@kivvi/core/src/domain/inventory-items");
      const db = getDb(context);

      const item = await resolveInventoryItem(db, context.companyId, params.item_identifier);
      if (!item) {
        return {
          success: false,
          error: `Item "${params.item_identifier}" not found. Use search_inventory to find the correct item.`,
        };
      }

      const {
        description,
        serial_number,
        location,
        asking_price,
        min_price,
        estimated_value,
        notes,
      } = params;

      if (
        description === undefined &&
        serial_number === undefined &&
        location === undefined &&
        asking_price === undefined &&
        min_price === undefined &&
        estimated_value === undefined &&
        notes === undefined
      ) {
        return {
          success: false,
          error:
            "No fields provided to update. Specify at least one of: description, serial_number, location, asking_price, min_price, estimated_value, notes.",
        };
      }

      const input: Record<string, string | null> = {};
      if (description !== undefined) input.description = description;
      if (serial_number !== undefined) input.serialNumber = serial_number;
      if (location !== undefined) input.location = location;
      if (asking_price !== undefined) input.askingPrice = new Decimal(asking_price).toFixed(2);
      if (min_price !== undefined) input.minPrice = new Decimal(min_price).toFixed(2);
      if (estimated_value !== undefined)
        input.estimatedValue = new Decimal(estimated_value).toFixed(2);
      if (notes !== undefined) input.notes = notes;

      await updateInventoryItem(db, context.companyId, item.id, input);

      const currency = context.defaultCurrency ?? DEFAULT_CURRENCY;
      const changes: string[] = [];
      if (description !== undefined) changes.push(`description updated`);
      if (serial_number !== undefined) changes.push(`serial number → "${serial_number}"`);
      if (location !== undefined) changes.push(`location → "${location}"`);
      if (asking_price !== undefined)
        changes.push(`asking price → ${currency} ${new Decimal(asking_price).toFixed(2)}`);
      if (min_price !== undefined)
        changes.push(`min price → ${currency} ${new Decimal(min_price).toFixed(2)}`);
      if (estimated_value !== undefined)
        changes.push(`acquisition value → ${currency} ${new Decimal(estimated_value).toFixed(2)}`);
      if (notes !== undefined) changes.push(`notes updated`);

      return {
        success: true,
        message: `${item.itemNumber} updated: ${changes.join(", ")}.`,
        data: {
          itemId: item.id,
          itemNumber: item.itemNumber,
          changes: Object.keys(input),
        },
        actions: [
          {
            label: `View ${item.itemNumber}`,
            action: "navigate",
            params: { url: `/intake/items/${item.id}` },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update item: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
