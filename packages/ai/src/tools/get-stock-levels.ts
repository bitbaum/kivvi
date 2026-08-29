import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const getStockLevelsSchema = z.object({
  warehouseId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "Filter by specific warehouse ID. If omitted, shows low-stock products across all warehouses.",
    ),
});

export const getStockLevelsTool: Tool = {
  name: "get_stock_levels",
  description: `Get an inventory overview. Without a warehouse ID, returns products with low stock levels across all warehouses. With a warehouse ID, returns all stock levels for that warehouse.`,
  parameters: getStockLevelsSchema,
  requiredPermissions: ["product:read"],
  execute: async (
    params: z.infer<typeof getStockLevelsSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { getStockLevelsByWarehouse, getLowStockProducts } = await import("@kivvi/core");
      const db = getDb(context);

      if (params.warehouseId) {
        const levels = await getStockLevelsByWarehouse(db, context.companyId, params.warehouseId);

        return {
          success: true,
          message: `Found ${levels.length} product(s) in warehouse.`,
          data: {
            warehouseId: params.warehouseId,
            products: levels.map((l) => ({
              productId: l.productId,
              productName: l.productName,
              articleNumber: l.articleNumber,
              quantity: Number(l.quantity),
              minStock: l.minStock,
              lowStock: l.minStock != null ? Number(l.quantity) <= l.minStock : false,
            })),
            count: levels.length,
          },
        };
      }

      const lowStock = await getLowStockProducts(db, context.companyId);

      if (lowStock.length === 0) {
        return {
          success: true,
          message: "No products with low stock levels found.",
          data: { products: [], count: 0 },
        };
      }

      return {
        success: true,
        message: `Found ${lowStock.length} product(s) with low stock.`,
        data: {
          products: lowStock.map((p) => ({
            productId: p.productId,
            productName: p.productName,
            articleNumber: p.articleNumber,
            totalStock: p.totalStock,
            minStock: p.minStock,
            deficit: p.minStock - p.totalStock,
          })),
          count: lowStock.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get stock levels: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
