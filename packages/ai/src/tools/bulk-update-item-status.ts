import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb, resolveInventoryItem } from "./utils";

const bulkUpdateItemStatusSchema = z.object({
  item_identifiers: z
    .array(z.string())
    .min(2)
    .max(200)
    .describe(
      "List of item numbers (e.g. IT-00042) or UUIDs to update. Use search_inventory to find items first.",
    ),
  status: z
    .enum([
      "intake",
      "testing",
      "repair",
      "ready_for_sale",
      "listed",
      "reserved",
      "donated",
      "parts_only",
      "recycled",
    ])
    .describe(
      "Target status for all items. Each item's current status must allow this transition — items that violate lifecycle rules are skipped and counted as failed.",
    ),
});

export const bulkUpdateItemStatusTool: Tool = {
  name: "bulk_update_item_status",
  description: `Transition multiple inventory items to a new status in one call. Items that cannot make the transition (lifecycle rule violations) are skipped without aborting the rest. Returns a succeeded/failed count with details on any failures.

Use search_inventory first to find the item numbers, then pass them here.

Examples:
- "Move all 50 laptops from the UBS donation to testing" (search first, then bulk update)
- "Mark IT-00001 through IT-00020 as ready_for_sale"
- "Send these 10 items to recycling: IT-00031, IT-00032, ..."
- "Bulk move items to repair after the tech checked them"

Note: for a single item use update_item_status instead.`,
  parameters: bulkUpdateItemStatusSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof bulkUpdateItemStatusSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { bulkUpdateStatus } = await import("@kivvi/core/src/domain/inventory-items");
      const db = getDb(context);

      // Resolve all identifiers to UUIDs first
      const resolveResults = await Promise.all(
        params.item_identifiers.map(async (identifier) => {
          const item = await resolveInventoryItem(db, context.companyId, identifier);
          return { identifier, item };
        }),
      );

      const notFound = resolveResults.filter((r) => !r.item).map((r) => r.identifier);

      const resolved = resolveResults.filter(
        (r): r is { identifier: string; item: NonNullable<typeof r.item> } => r.item !== null,
      );

      if (resolved.length === 0) {
        return {
          success: false,
          error: `None of the provided identifiers were found: ${notFound.slice(0, 5).join(", ")}${notFound.length > 5 ? ` … and ${notFound.length - 5} more` : ""}. Use search_inventory to find the correct item numbers.`,
        };
      }

      const itemIds = resolved.map((r) => r.item.id);
      const { succeeded, failed } = await bulkUpdateStatus(
        db,
        context.companyId,
        itemIds,
        params.status,
      );

      const totalAttempted = resolved.length;
      const notFoundCount = notFound.length;

      const parts: string[] = [];
      if (succeeded > 0)
        parts.push(`${succeeded} item${succeeded !== 1 ? "s" : ""} → "${params.status}"`);
      if (failed > 0) parts.push(`${failed} skipped (invalid transition)`);
      if (notFoundCount > 0) parts.push(`${notFoundCount} not found`);

      const message = parts.join(", ") + ".";

      return {
        success: true,
        message,
        data: {
          requested: params.item_identifiers.length,
          resolved: totalAttempted,
          succeeded,
          failed,
          notFound: notFoundCount > 0 ? notFound : undefined,
          newStatus: params.status,
        },
        actions: [
          {
            label: "View Inventory",
            action: "navigate",
            params: { url: "/intake/items" },
            variant: "primary",
          },
          ...(params.status === "repair"
            ? [
                {
                  label: "Repair Queue",
                  action: "navigate" as const,
                  params: { url: "/intake/repair-queue" },
                },
              ]
            : []),
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to bulk update status: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
