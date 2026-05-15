import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const returnInventoryItemSchema = z.object({
  item_identifier: z
    .string()
    .describe(
      "Item number (e.g. IT-00042) or item UUID. The item must currently be in sold status.",
    ),
});

export const returnInventoryItemTool: Tool = {
  name: "return_inventory_item",
  description: `Mark a sold inventory item as returned. The item must currently have status "sold". After returning, the item status becomes "returned" and can be re-assessed and re-listed if appropriate.

Examples:
- "Customer returned IT-00042"
- "Mark item IT-00117 as returned"`,
  parameters: returnInventoryItemSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof returnInventoryItemSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { returnInventoryItem } =
        await import("@kivvi/core/src/domain/inventory-items");
      const { inventoryItems } = await import("@kivvi/database");
      const db = getDb(context);

      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          params.item_identifier,
        );

      const [row] = await db
        .select({
          id: inventoryItems.id,
          itemNumber: inventoryItems.itemNumber,
          description: inventoryItems.description,
          status: inventoryItems.status,
        })
        .from(inventoryItems)
        .where(
          and(
            isUUID
              ? eq(inventoryItems.id, params.item_identifier)
              : eq(
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

      if (row.status !== "sold") {
        return {
          success: false,
          error: `Cannot return ${row.itemNumber}: item is "${row.status}", not "sold".`,
        };
      }

      await returnInventoryItem(db, context.companyId, row.id);

      return {
        success: true,
        message: `${row.itemNumber} (${row.description}) marked as returned.`,
        data: {
          itemId: row.id,
          itemNumber: row.itemNumber,
          description: row.description,
          previousStatus: "sold",
          newStatus: "returned",
        },
        actions: [
          {
            label: `View ${row.itemNumber}`,
            action: "navigate",
            params: { url: `/intake/items/${row.id}` },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to return item: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
