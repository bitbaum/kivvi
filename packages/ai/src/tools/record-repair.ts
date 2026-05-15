import Decimal from "decimal.js";
import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb, resolveInventoryItem } from "./utils";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";

const recordRepairSchema = z.object({
  item_identifier: z
    .string()
    .describe(
      "Item number (e.g. IT-00042) or item UUID. Use search_inventory first if unsure.",
    ),
  cost: z
    .number()
    .min(0)
    .describe(
      "Repair cost in CHF (accumulated — adds to existing repair cost on the item)",
    ),
  hours: z
    .number()
    .min(0)
    .optional()
    .describe("Labour hours spent on this repair (optional)"),
  note: z
    .string()
    .max(500)
    .optional()
    .describe(
      "Description of the repair work done (e.g. 'Replaced battery', 'Data erasure + OS reinstall')",
    ),
});

export const recordRepairTool: Tool = {
  name: "record_repair",
  description: `Record a repair entry on an inventory item. Accumulates cost and hours — each call adds to the running total. Does NOT change item status; use update_item_status to transition to testing after repair is done.

Examples:
- "Record CHF 35 battery replacement on item IT-00042"
- "Log 1.5 hours data erasure on item IT-00123, cost CHF 0"
- "Add CHF 60 keyboard repair to IT-00099: new keyboard + palmrest"`,
  parameters: recordRepairSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof recordRepairSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { recordRepair } =
        await import("@kivvi/core/src/domain/inventory-items");
      const db = getDb(context);

      const item = await resolveInventoryItem(
        db,
        context.companyId,
        params.item_identifier,
      );
      if (!item) {
        return {
          success: false,
          error: `Item "${params.item_identifier}" not found. Use search_inventory to find the correct item number.`,
        };
      }

      const updated = await recordRepair(db, context.companyId, item.id, {
        cost: String(params.cost),
        hours: params.hours !== undefined ? String(params.hours) : undefined,
        note: params.note,
      });

      const prevCost = new Decimal(item.repairCost ?? "0");
      const newTotalCost = new Decimal(updated.repairCost ?? "0");
      const currency = context.defaultCurrency ?? DEFAULT_CURRENCY;

      const hoursNote =
        params.hours !== undefined && params.hours > 0
          ? ` (${params.hours}h labour)`
          : "";
      const workNote = params.note ? `: ${params.note}` : "";

      return {
        success: true,
        message: `Recorded ${currency} ${params.cost.toFixed(2)}${hoursNote} repair on ${item.itemNumber}${workNote}. Total repair cost: ${currency} ${newTotalCost.toDecimalPlaces(2)} (was ${currency} ${prevCost.toDecimalPlaces(2)}).`,
        data: {
          itemId: item.id,
          itemNumber: item.itemNumber,
          addedCost: params.cost,
          addedHours: params.hours ?? 0,
          note: params.note ?? null,
          totalRepairCost: newTotalCost,
          repairLog: updated.repairLog,
        },
        actions: [
          {
            label: `View ${item.itemNumber}`,
            action: "navigate",
            params: { url: `/intake/items/${item.id}` },
            variant: "primary",
          },
          {
            label: "Repair Queue",
            action: "navigate",
            params: { url: "/intake/repair-queue" },
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to record repair: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
