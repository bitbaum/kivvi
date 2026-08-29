import { z } from "zod";
import Decimal from "decimal.js";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb, resolveInventoryItem } from "./utils";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";

const recordRepairPartSchema = z.object({
  item_identifier: z
    .string()
    .describe("Item number (e.g. IT-00042) or item UUID. Use search_inventory first if unsure."),
  description: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "Name or description of the part used (e.g. 'Battery 5000mAh', 'Replacement screen', 'Power adapter')",
    ),
  unit_cost: z.number().min(0).describe("Cost per unit in CHF"),
  quantity: z.number().min(0.0001).optional().default(1).describe("Quantity used (defaults to 1)"),
  notes: z
    .string()
    .max(500)
    .optional()
    .describe("Optional notes (e.g. part number, supplier, condition)"),
});

export const recordRepairPartTool: Tool = {
  name: "record_repair_part",
  description: `Record a specific part or component used during repair of an inventory item. Each call adds one line item to the parts list with description, quantity, and unit cost. Use this to track the cost breakdown of a repair (e.g. CHF 25 battery + CHF 5 thermal paste = CHF 30 parts total).

Examples:
- "Add a CHF 45 replacement screen to the repair of IT-00042"
- "IT-00123 needed a new battery (CHF 28) and thermal paste (CHF 4)"
- "Record 2× USB-C port (CHF 8 each) used on IT-00099"`,
  parameters: recordRepairPartSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof recordRepairPartSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { addRepairPart } = await import("@kivvi/core/src/domain/inventory-items");
      const db = getDb(context);

      const item = await resolveInventoryItem(db, context.companyId, params.item_identifier);
      if (!item) {
        return {
          success: false,
          error: `Item "${params.item_identifier}" not found. Use search_inventory to find the correct item number.`,
        };
      }

      const quantity = params.quantity ?? 1;
      const part = await addRepairPart(db, context.companyId, item.id, {
        description: params.description,
        quantity: String(quantity),
        unitCost: String(params.unit_cost),
        notes: params.notes ?? undefined,
      });

      const currency = context.defaultCurrency ?? DEFAULT_CURRENCY;
      const lineTotal = new Decimal(quantity).times(new Decimal(params.unit_cost)).toFixed(2);
      const qtyNote = quantity !== 1 ? `${quantity}× ` : "";

      return {
        success: true,
        message: `Added repair part to ${item.itemNumber}: ${qtyNote}${params.description} — ${currency} ${lineTotal}${params.notes ? ` (${params.notes})` : ""}.`,
        data: {
          partId: part.id,
          itemId: item.id,
          itemNumber: item.itemNumber,
          description: params.description,
          quantity,
          unitCost: params.unit_cost,
          lineTotal: new Decimal(lineTotal).toNumber(),
          notes: params.notes ?? null,
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
        error: `Failed to record repair part: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
