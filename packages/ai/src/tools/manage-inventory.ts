import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const recordStockMovementSchema = z.object({
  productId: z.string().uuid().describe("The UUID of the product"),
  warehouseId: z.string().uuid().describe("The UUID of the warehouse"),
  type: z
    .enum(["purchase", "sale", "adjustment", "transfer", "return"])
    .describe(
      "Type of stock movement: purchase (incoming), sale (outgoing), adjustment (correction), transfer (between warehouses), return (incoming return)",
    ),
  quantity: z
    .number()
    .describe(
      "Quantity to move. Positive for incoming (purchase, return), negative for outgoing (sale). For adjustments, use the difference amount.",
    ),
  notes: z
    .string()
    .optional()
    .describe(
      "Reference or notes for this movement (e.g. delivery note number, reason for adjustment)",
    ),
});

export const recordStockMovementTool: Tool = {
  name: "record_stock_movement",
  description: `Record a stock movement (purchase, sale, adjustment, transfer, or return) for a product in a specific warehouse. Automatically updates the stock level. Use positive quantities for incoming stock and negative for outgoing.`,
  parameters: recordStockMovementSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof recordStockMovementSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { createStockMovement } = await import("@kivvi/core");
      const db = getDb(context);

      const movement = await createStockMovement(db, context.companyId, {
        productId: params.productId,
        warehouseId: params.warehouseId,
        type: params.type,
        quantity: String(params.quantity),
        reference: params.notes || null,
      });

      const typeLabels: Record<string, string> = {
        purchase: "Purchase (incoming)",
        sale: "Sale (outgoing)",
        adjustment: "Adjustment",
        transfer: "Transfer",
        return: "Return (incoming)",
      };

      return {
        success: true,
        message: `Recorded ${typeLabels[params.type]} of ${params.quantity} units. Stock level updated.`,
        data: {
          movementId: movement.id,
          productId: params.productId,
          warehouseId: params.warehouseId,
          type: params.type,
          quantity: params.quantity,
          notes: params.notes || null,
        },
        actions: [
          {
            label: "View Inventory",
            action: "navigate",
            params: { url: "/inventory" },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to record stock movement: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
