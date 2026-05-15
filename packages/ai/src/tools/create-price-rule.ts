import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb, resolveProduct, resolvePriceList } from "./utils";
import { PRICE_RULE_TYPE_VALUES } from "@kivvi/database/src/enums";

const createPriceRuleSchema = z.object({
  price_list_name: z
    .string()
    .describe(
      "Name of the price list to add the rule to (partial match, e.g. 'wholesale').",
    ),
  type: z.enum(PRICE_RULE_TYPE_VALUES).describe(
    `Rule type:
- "fixed": sets a specific price (e.g. CHF 49.90 regardless of base price)
- "percentage": applies a discount percentage off the base price (e.g. 10 = 10% off)
- "tiered": same as percentage but only activates at min_quantity`,
  ),
  value: z
    .number()
    .nonnegative()
    .describe(
      'Rule value: exact price in CHF for "fixed", discount percentage for "percentage"/"tiered" (e.g. 15 = 15% off)',
    ),
  product_identifier: z
    .string()
    .optional()
    .describe(
      "Product to target (name partial match, article number, or UUID). Omit for a list-wide rule applying to all products.",
    ),
  min_quantity: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Minimum quantity threshold. Required when type is "tiered".'),
  valid_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .optional()
    .describe(
      "Date the rule becomes active (YYYY-MM-DD). Omit = always active.",
    ),
  valid_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .optional()
    .describe("Date the rule expires (YYYY-MM-DD). Omit = never expires."),
});

export const createPriceRuleTool: Tool = {
  name: "create_price_rule",
  description: `Add a pricing rule to an existing price list. Rules can apply to all products (list-wide) or a specific product. Supports fixed prices, percentage discounts, and tiered/volume discounts.

Examples:
- "Add 10% discount for all products in the student list"
- "Set ThinkPad T490 to CHF 299 in the refurbished list"
- "Add 15% tiered discount for orders of 10+ units in the wholesale list for ART-00042"
- "20% off all products in the spring-sale list from 2026-03-01 to 2026-03-31"`,
  parameters: createPriceRuleSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof createPriceRuleSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { createPriceRule } =
        await import("@kivvi/core/src/domain/pricing");
      const db = getDb(context);

      const listRow = await resolvePriceList(
        db,
        context.companyId,
        params.price_list_name,
      );

      if (!listRow) {
        return {
          success: false,
          error: `Price list "${params.price_list_name}" not found. Use get_price_lists to see available lists.`,
        };
      }

      // Resolve product if specified
      let productId: string | null = null;
      let productLabel: string | null = null;

      if (params.product_identifier) {
        const productRow = await resolveProduct(
          db,
          context.companyId,
          params.product_identifier,
        );

        if (!productRow) {
          return {
            success: false,
            error: `Product "${params.product_identifier}" not found. Use search_products to find the correct name or article number.`,
          };
        }

        productId = productRow.id;
        productLabel = productRow.articleNumber
          ? `${productRow.name} (${productRow.articleNumber})`
          : productRow.name;
      }

      // Validate tiered requires min_quantity
      if (params.type === "tiered" && !params.min_quantity) {
        return {
          success: false,
          error:
            "Tiered rules require min_quantity. Example: min_quantity: 10 means the discount kicks in at 10+ units.",
        };
      }

      const rule = await createPriceRule(db, context.companyId, listRow.id, {
        type: params.type,
        value: params.value.toString(),
        productId,
        productGroupId: null,
        minQuantity: params.min_quantity ? String(params.min_quantity) : null,
        validFrom: params.valid_from ?? null,
        validTo: params.valid_to ?? null,
      });

      const currency = context.defaultCurrency ?? "CHF";
      const scopeLabel = productLabel ?? "all products";
      const ruleDesc =
        params.type === "fixed"
          ? `fixed ${currency} ${params.value.toFixed(2)}`
          : params.type === "percentage"
            ? `${params.value}% discount`
            : `${params.value}% tiered (min qty ${params.min_quantity})`;
      const dateRange =
        params.valid_from || params.valid_to
          ? ` valid ${params.valid_from ?? "now"} – ${params.valid_to ?? "always"}`
          : "";

      return {
        success: true,
        message: `Added rule to "${listRow.name}": ${ruleDesc} for ${scopeLabel}${dateRange}.`,
        data: {
          ruleId: rule.id,
          priceListId: listRow.id,
          priceListName: listRow.name,
          type: rule.type,
          value: rule.value,
          productId,
          productLabel,
          minQuantity: rule.minQuantity,
          validFrom: rule.validFrom,
          validTo: rule.validTo,
        },
        actions: [
          {
            label: `View "${listRow.name}"`,
            action: "navigate",
            params: { url: "/pricing" },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create price rule: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
