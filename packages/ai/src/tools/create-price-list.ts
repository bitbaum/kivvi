import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const createPriceListSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe('Name for the price list (e.g. "Wholesale", "Student Discount", "Spring Sale 2026")'),
  currency: z.string().length(3).default("CHF").describe("ISO currency code (default: CHF)"),
  is_default: z
    .boolean()
    .default(false)
    .describe(
      "Set as the company default price list. Clears the default flag on any existing default list.",
    ),
});

export const createPriceListTool: Tool = {
  name: "create_price_list",
  description: `Create a new price list. Price lists hold pricing rules (fixed prices, discounts, tiered rates) that can be applied to customers or document types. After creating, use create_price_rule to add rules to it.

Examples:
- "Create a wholesale price list"
- "Set up a student discount list as default"
- "Create a spring sale price list in EUR"`,
  parameters: createPriceListSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof createPriceListSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { createPriceList } = await import("@kivvi/core/src/domain/pricing");
      const db = getDb(context);

      const list = await createPriceList(db, context.companyId, {
        name: params.name,
        currency: params.currency ?? "CHF",
        isDefault: params.is_default ?? false,
      });

      const defaultNote = list.isDefault ? " (set as default)" : "";

      return {
        success: true,
        message: `Created price list "${list.name}" (${list.currency})${defaultNote}. Add rules with create_price_rule.`,
        data: {
          id: list.id,
          name: list.name,
          currency: list.currency,
          isDefault: list.isDefault,
        },
        actions: [
          {
            label: "Manage Price Lists",
            action: "navigate",
            params: { url: "/pricing" },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create price list: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
