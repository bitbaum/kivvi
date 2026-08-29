import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const searchInventorySchema = z.object({
  query: z.string().optional().describe("Search by item description, number, or serial number"),
  status: z
    .enum([
      "intake",
      "testing",
      "repair",
      "ready_for_sale",
      "listed",
      "reserved",
      "sold",
      "donated",
      "recycled",
    ])
    .optional()
    .describe("Filter by item status"),
  condition: z
    .enum(["untested", "like_new", "good", "fair", "poor", "parts_only", "scrap"])
    .optional()
    .describe("Filter by condition"),
  limit: z.number().default(10).describe("Max results"),
});

export const searchInventoryTool: Tool = {
  name: "search_inventory",
  description:
    "Search inventory items — the individually tracked secondhand goods. Filter by status (intake, testing, repair, ready_for_sale, listed, sold, etc.), condition (untested, good, fair, poor, etc.), or search by description. Returns items with their condition, status, pricing, and donor info.",
  parameters: searchInventorySchema,
  requiredPermissions: ["product:read"],
  execute: async (
    params: z.infer<typeof searchInventorySchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { listInventoryItems } = await import("@kivvi/core");
      const db = getDb(context);

      const result = await listInventoryItems(db, context.companyId, {
        search: params.query,
        status: params.status,
        condition: params.condition,
        pageSize: params.limit,
      });

      if (result.data.length === 0) {
        return {
          success: true,
          message: "No inventory items found matching your criteria.",
          data: { items: [], total: 0 },
          actions: [
            {
              label: "View All Items",
              action: "navigate",
              params: { url: "/intake/items" },
            },
          ],
        };
      }

      const items = result.data.map((item) => ({
        itemNumber: item.itemNumber,
        description: item.description,
        condition: item.condition,
        status: item.status,
        askingPrice: item.askingPrice ? `${context.defaultCurrency} ${item.askingPrice}` : null,
        estimatedValue: item.estimatedValue
          ? `${context.defaultCurrency} ${item.estimatedValue}`
          : null,
        donor: item.donorName || null,
        warehouse: item.warehouseName || null,
      }));

      return {
        success: true,
        message: `Found ${result.total} item${result.total !== 1 ? "s" : ""}${params.status ? ` in status "${params.status}"` : ""}${params.condition ? ` in condition "${params.condition}"` : ""}.`,
        data: { items, total: result.total },
        actions: [
          {
            label: "View Items",
            action: "navigate",
            params: {
              url: `/intake/items${params.status ? `?status=${params.status}` : ""}`,
            },
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search inventory: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
