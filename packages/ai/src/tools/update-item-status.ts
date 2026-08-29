import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb, resolveInventoryItem } from "./utils";

const updateItemStatusSchema = z.object({
  item_identifier: z
    .string()
    .describe(
      "Item number (e.g. IT-00042) or item UUID. Use search_inventory to find the correct item.",
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
      "New status. Valid transitions depend on current status — the system enforces lifecycle rules. Key rule: repair → testing (never directly to ready_for_sale).",
    ),
});

const updateItemConditionSchema = z.object({
  item_identifier: z.string().describe("Item number (e.g. IT-00042) or item UUID."),
  condition: z
    .enum(["untested", "like_new", "good", "fair", "poor", "parts_only", "scrap"])
    .describe(
      "Condition grade. Must be set before approving for sale (cannot be 'untested' for ready_for_sale).",
    ),
});

export const updateItemStatusTool: Tool = {
  name: "update_item_status",
  description: `Transition an inventory item to a new status. Enforces the lifecycle rules:
- intake → testing | ready_for_sale | recycled
- testing → repair | ready_for_sale | parts_only | recycled
- repair → testing | parts_only | recycled  (repair NEVER goes directly to ready_for_sale)
- ready_for_sale → listed | reserved | donated
- listed / reserved → sold | ready_for_sale
- sold → returned

Use after record_repair to move an item back to testing. Use when a technician completes work.`,
  parameters: updateItemStatusSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof updateItemStatusSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { updateItemStatus } = await import("@kivvi/core/src/domain/inventory-items");
      const db = getDb(context);

      const item = await resolveInventoryItem(db, context.companyId, params.item_identifier);
      if (!item) {
        return {
          success: false,
          error: `Item "${params.item_identifier}" not found. Use search_inventory to find the correct item.`,
        };
      }

      const updated = await updateItemStatus(
        db,
        context.companyId,
        item.id,
        params.status,
        context.userId,
      );

      return {
        success: true,
        message: `${item.itemNumber} moved from "${item.status}" → "${updated.status}".`,
        data: {
          itemId: item.id,
          itemNumber: item.itemNumber,
          previousStatus: item.status,
          newStatus: updated.status,
        },
        actions: [
          {
            label: `View ${item.itemNumber}`,
            action: "navigate",
            params: { url: `/intake/items/${item.id}` },
            variant: "primary",
          },
          ...(updated.status === "repair"
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
      const msg = error instanceof Error ? error.message : "Unknown error";
      // Surface quality-gate failures clearly so the user knows what to fix
      return {
        success: false,
        error: msg.startsWith("Cannot") ? msg : `Failed to update item status: ${msg}`,
      };
    }
  },
};

export const updateItemConditionTool: Tool = {
  name: "update_item_condition",
  description: `Set the condition grade of an inventory item (like_new, good, fair, poor, parts_only, scrap). Must be set before an item can be approved for sale — the system blocks ready_for_sale if condition is still "untested".

Condition grades:
- like_new: Virtually unused, minimal or no wear
- good: Light wear, fully functional
- fair: Visible wear, fully functional
- poor: Heavy wear or minor functional issues
- parts_only: Not saleable as a unit — useful for spare parts
- scrap: No value, route to recycling`,
  parameters: updateItemConditionSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof updateItemConditionSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { updateItemCondition } = await import("@kivvi/core/src/domain/inventory-items");
      const db = getDb(context);

      const item = await resolveInventoryItem(db, context.companyId, params.item_identifier);
      if (!item) {
        return {
          success: false,
          error: `Item "${params.item_identifier}" not found.`,
        };
      }

      const updated = await updateItemCondition(db, context.companyId, item.id, params.condition);

      return {
        success: true,
        message: `${item.itemNumber} condition set to "${updated.condition}"${item.condition !== "untested" ? ` (was "${item.condition}")` : ""}.`,
        data: {
          itemId: item.id,
          itemNumber: item.itemNumber,
          previousCondition: item.condition,
          newCondition: updated.condition,
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
        error: `Failed to update condition: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
