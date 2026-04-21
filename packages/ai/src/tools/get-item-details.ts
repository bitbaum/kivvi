import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const getItemDetailsSchema = z.object({
  item_identifier: z
    .string()
    .describe(
      "Item number (e.g. IT-00042) or item UUID. Use search_inventory to find the correct item number.",
    ),
});

export const getItemDetailsTool: Tool = {
  name: "get_item_details",
  description: `Get full details of a specific inventory item: condition, status, pricing, repair history, data erasure status, checklist completion, and provenance (donor/source). Use this when the user asks about a specific item's history, cost basis, or readiness for sale.`,
  parameters: getItemDetailsSchema,
  requiredPermissions: ["product:read"],
  execute: async (
    params: z.infer<typeof getItemDetailsSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { getInventoryItem } =
        await import("@kivvi/core/src/domain/inventory-items");
      const { inventoryItems } = await import("@kivvi/database");
      const db = getDb(context);

      // Resolve item number or UUID
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          params.item_identifier,
        );

      let itemId: string;

      if (isUUID) {
        itemId = params.item_identifier;
      } else {
        const [row] = await db
          .select({ id: inventoryItems.id })
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
      }

      const item = await getInventoryItem(db, context.companyId, itemId);

      if (!item) {
        return {
          success: false,
          error: `Item not found or you do not have access to it.`,
        };
      }

      const currency = context.defaultCurrency ?? "CHF";

      // Build repair summary from log
      const repairLines = item.repairLog
        ? item.repairLog.split("\n").filter(Boolean)
        : [];

      // Checklist summary
      type ChecklistData = {
        category?: string;
        completions?: Array<{ id: string; result: string; value?: string }>;
      };
      const checklistData = item.checklistData as ChecklistData | null;
      const checklistSummary = checklistData?.completions
        ? {
            category: checklistData.category,
            total: checklistData.completions.length,
            passed: checklistData.completions.filter((c) => c.result === "pass")
              .length,
            failed: checklistData.completions.filter((c) => c.result === "fail")
              .length,
            skipped: checklistData.completions.filter(
              (c) => c.result === "skip",
            ).length,
          }
        : null;

      return {
        success: true,
        message: `Details for ${item.itemNumber}: ${item.description} — ${item.status}, ${item.condition}.`,
        data: {
          id: item.id,
          itemNumber: item.itemNumber,
          description: item.description,
          status: item.status,
          condition: item.condition,
          category: item.category ?? null,
          serialNumber: item.serialNumber ?? null,
          location: item.location ?? null,
          warehouse: item.warehouseName ?? null,
          provenance: {
            donor: item.donorName ?? null,
            intakeDocumentId: item.intakeDocumentId ?? null,
          },
          pricing: {
            acquisitionCost: item.estimatedValue
              ? `${currency} ${parseFloat(item.estimatedValue).toFixed(2)}`
              : null,
            repairCost:
              item.repairCost && parseFloat(item.repairCost) > 0
                ? `${currency} ${parseFloat(item.repairCost).toFixed(2)}`
                : null,
            effectiveCost: item.effectiveCost
              ? `${currency} ${parseFloat(item.effectiveCost).toFixed(2)}`
              : null,
            askingPrice: item.askingPrice
              ? `${currency} ${parseFloat(item.askingPrice).toFixed(2)}`
              : null,
            minPrice: item.minPrice
              ? `${currency} ${parseFloat(item.minPrice).toFixed(2)}`
              : null,
            soldPrice: item.soldPrice
              ? `${currency} ${parseFloat(item.soldPrice).toFixed(2)}`
              : null,
          },
          repair: {
            totalCost:
              item.repairCost && parseFloat(item.repairCost) > 0
                ? `${currency} ${parseFloat(item.repairCost).toFixed(2)}`
                : null,
            totalHours: item.repairHours ? parseFloat(item.repairHours) : null,
            logEntries: repairLines,
          },
          dataErasure: {
            erased: item.dataErasuredAt !== null,
            method: item.dataErasureMethod ?? null,
            erasedAt: item.dataErasuredAt
              ? new Date(item.dataErasuredAt).toISOString().split("T")[0]
              : null,
          },
          checklist: checklistSummary,
          notes: item.notes ?? null,
          assignedTo: item.assignedToName ?? null,
          createdAt: new Date(item.createdAt).toISOString().split("T")[0],
        },
        actions: [
          {
            label: `View ${item.itemNumber}`,
            action: "navigate",
            params: { url: `/intake/items/${item.id}` },
            variant: "primary",
          },
          ...(item.status === "repair"
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
        error: `Failed to get item details: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
