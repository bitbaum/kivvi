import Decimal from "decimal.js";
import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb, resolveInventoryItem } from "./utils";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";

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
      const { getInventoryItem, listRepairParts } =
        await import("@kivvi/core/src/domain/inventory-items");
      const db = getDb(context);

      const resolved = await resolveInventoryItem(
        db,
        context.companyId,
        params.item_identifier,
      );
      if (!resolved) {
        return {
          success: false,
          error: `Item "${params.item_identifier}" not found. Use search_inventory to find the correct item number.`,
        };
      }

      const [item, repairParts] = await Promise.all([
        getInventoryItem(db, context.companyId, resolved.id),
        listRepairParts(db, context.companyId, resolved.id),
      ]);

      if (!item) {
        return {
          success: false,
          error: `Item not found or you do not have access to it.`,
        };
      }

      const currency = context.defaultCurrency ?? DEFAULT_CURRENCY;

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
              ? `${currency} ${new Decimal(item.estimatedValue).toDecimalPlaces(2)}`
              : null,
            repairCost:
              item.repairCost && new Decimal(item.repairCost).gt(0)
                ? `${currency} ${new Decimal(item.repairCost).toDecimalPlaces(2)}`
                : null,
            effectiveCost: item.effectiveCost
              ? `${currency} ${new Decimal(item.effectiveCost).toDecimalPlaces(2)}`
              : null,
            askingPrice: item.askingPrice
              ? `${currency} ${new Decimal(item.askingPrice).toDecimalPlaces(2)}`
              : null,
            minPrice: item.minPrice
              ? `${currency} ${new Decimal(item.minPrice).toDecimalPlaces(2)}`
              : null,
            soldPrice: item.soldPrice
              ? `${currency} ${new Decimal(item.soldPrice).toDecimalPlaces(2)}`
              : null,
          },
          repair: {
            labourCost:
              item.repairCost && new Decimal(item.repairCost).gt(0)
                ? `${currency} ${new Decimal(item.repairCost).toDecimalPlaces(2)}`
                : null,
            totalHours: item.repairHours
              ? new Decimal(item.repairHours).toNumber()
              : null,
            logEntries: repairLines,
            parts: repairParts.map((p) => ({
              id: p.id,
              description: p.description,
              quantity: new Decimal(p.quantity).toNumber(),
              unitCost: `${currency} ${new Decimal(p.unitCost).toDecimalPlaces(2)}`,
              lineTotal: `${currency} ${new Decimal(p.quantity).times(p.unitCost).toDecimalPlaces(2)}`,
              notes: p.notes ?? null,
            })),
            partsTotal:
              repairParts.length > 0
                ? `${currency} ${repairParts.reduce((sum, p) => sum.plus(new Decimal(p.quantity).times(p.unitCost)), new Decimal(0)).toDecimalPlaces(2)}`
                : null,
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
