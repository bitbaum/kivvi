import Decimal from "decimal.js";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

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
      const { inventoryItems } = await import("@kivvi/database");
      const db = getDb(context);

      // Resolve item: accept UUID or item number (e.g. "IT-00042")
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          params.item_identifier,
        );

      let itemId: string;
      let itemNumber: string;
      let currentRepairCost: string | null;

      if (isUUID) {
        // Direct UUID lookup
        const [row] = await db
          .select({
            id: inventoryItems.id,
            itemNumber: inventoryItems.itemNumber,
            repairCost: inventoryItems.repairCost,
            companyId: inventoryItems.companyId,
          })
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.id, params.item_identifier),
              eq(inventoryItems.companyId, context.companyId),
            ),
          )
          .limit(1);

        if (!row) {
          return {
            success: false,
            error: `Item with ID "${params.item_identifier}" not found.`,
          };
        }
        itemId = row.id;
        itemNumber = row.itemNumber;
        currentRepairCost = row.repairCost;
      } else {
        // Item number lookup (case-insensitive)
        const [row] = await db
          .select({
            id: inventoryItems.id,
            itemNumber: inventoryItems.itemNumber,
            repairCost: inventoryItems.repairCost,
          })
          .from(inventoryItems)
          .where(
            and(
              eq(
                inventoryItems.itemNumber,
                params.item_identifier.toUpperCase(),
              ),
              eq(inventoryItems.companyId, context.companyId),
            ),
          )
          .limit(1);

        if (!row) {
          return {
            success: false,
            error: `Item "${params.item_identifier}" not found. Use search_inventory to find the correct item number.`,
          };
        }
        itemId = row.id;
        itemNumber = row.itemNumber;
        currentRepairCost = row.repairCost;
      }

      const updated = await recordRepair(db, context.companyId, itemId, {
        cost: String(params.cost),
        hours: params.hours !== undefined ? String(params.hours) : undefined,
        note: params.note,
      });

      const prevCost = new Decimal(currentRepairCost ?? "0");
      const newTotalCost = new Decimal(updated.repairCost ?? "0");
      const currency = context.defaultCurrency ?? "CHF";

      const hoursNote =
        params.hours !== undefined && params.hours > 0
          ? ` (${params.hours}h labour)`
          : "";
      const workNote = params.note ? `: ${params.note}` : "";

      return {
        success: true,
        message: `Recorded ${currency} ${params.cost.toFixed(2)}${hoursNote} repair on ${itemNumber}${workNote}. Total repair cost: ${currency} ${newTotalCost.toDecimalPlaces(2)} (was ${currency} ${prevCost.toDecimalPlaces(2)}).`,
        data: {
          itemId,
          itemNumber,
          addedCost: params.cost,
          addedHours: params.hours ?? 0,
          note: params.note ?? null,
          totalRepairCost: newTotalCost,
          repairLog: updated.repairLog,
        },
        actions: [
          {
            label: `View ${itemNumber}`,
            action: "navigate",
            params: { url: `/intake/items/${itemId}` },
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
