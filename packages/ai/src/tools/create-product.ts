import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";
import { DEFAULT_VAT_RATE } from "@kivvi/core/src/config/vat-rates";

const createProductSchema = z.object({
  name: z.string().min(1).describe("Product or service name"),
  type: z
    .enum(["product", "service"])
    .default("product")
    .describe("Whether this is a physical product or a service"),
  unitPrice: z
    .number()
    .nonnegative()
    .describe("Unit price in the company default currency (e.g. 49.90)"),
  vatRate: z
    .number()
    .default(Number(DEFAULT_VAT_RATE))
    .describe(
      "VAT rate as percentage (8.1 for standard Swiss VAT, 2.6 for reduced, 0 for exempt)",
    ),
  unit: z
    .enum(["piece", "hour", "kg", "m", "m2", "m3", "liter"])
    .default("piece")
    .describe("Unit of measure (piece, hour, kg, m, m2, m3, liter)"),
  description: z.string().optional().describe("Detailed product description"),
  notes: z
    .string()
    .optional()
    .describe("Internal notes (not shown on documents)"),
});

export const createProductTool: Tool = {
  name: "create_product",
  description: `Create a new product or service. Automatically generates an article number (ART-00001 format). Products can then be used as line items on documents. For services, set type to "service" and unit to "hour".`,
  parameters: createProductSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof createProductSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { createProduct } = await import("@kivvi/core");
      const db = getDb(context);

      const product = await createProduct(db, context.companyId, {
        name: params.name,
        type: params.type,
        unitPrice: params.unitPrice.toFixed(2),
        vatRate: params.vatRate.toFixed(2),
        unit: params.unit,
        currency: context.defaultCurrency,
        description: params.description || null,
        notes: params.notes || null,
        serialNumberTracking: false,
        shopVisible: false,
      });

      return {
        success: true,
        message: `Created ${params.type} "${product.name}" (${product.articleNumber}) at ${context.defaultCurrency} ${Number(product.unitPrice).toFixed(2)}.`,
        data: {
          id: product.id,
          articleNumber: product.articleNumber,
          name: product.name,
          type: product.type,
          unitPrice: `${product.currency} ${Number(product.unitPrice).toFixed(2)}`,
          vatRate: `${product.vatRate}%`,
          unit: product.unit,
        },
        actions: [
          {
            label: "View Product",
            action: "navigate",
            params: { url: `/products/${product.id}` },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create product: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
