import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb, resolveProduct, resolvePriceList } from "./utils";

const resolveProductPriceSchema = z.object({
  product_identifier: z
    .string()
    .describe(
      "Product name (partial match), article number (ART-xxxxx), or UUID.",
    ),
  price_list_name: z
    .string()
    .describe("Name of the price list to check (partial match)."),
  quantity: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Quantity ordered. Required for tiered/volume rules to apply correctly.",
    ),
});

export const resolveProductPriceTool: Tool = {
  name: "resolve_product_price",
  description: `Check the effective price a product would have under a specific price list, optionally for a given quantity. Returns the resolved price, the rule that applied, and the base price for comparison.

Examples:
- "What price does the wholesale list give for the ThinkPad T490?"
- "What's the tiered price for 25 units of ART-00012 under the volume list?"
- "Would a student get a discount on the monitor?"`,
  parameters: resolveProductPriceSchema,
  requiredPermissions: ["product:read"],
  execute: async (
    params: z.infer<typeof resolveProductPriceSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { resolvePriceForProduct } =
        await import("@kivvi/core/src/domain/pricing");
      const db = getDb(context);

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

      const resolved = await resolvePriceForProduct(
        db,
        context.companyId,
        productRow.id,
        listRow.id,
        params.quantity,
      );

      const currency = productRow.currency ?? context.defaultCurrency ?? "CHF";
      const basePrice = Number(productRow.unitPrice).toFixed(2);
      const productLabel = productRow.articleNumber
        ? `${productRow.name} (${productRow.articleNumber})`
        : productRow.name;

      if (!resolved) {
        return {
          success: true,
          message: `No pricing rule applies to ${productLabel} under "${listRow.name}"${params.quantity ? ` for qty ${params.quantity}` : ""}. Base price: ${currency} ${basePrice}.`,
          data: {
            productId: productRow.id,
            productName: productRow.name,
            articleNumber: productRow.articleNumber,
            priceListId: listRow.id,
            priceListName: listRow.name,
            basePrice,
            resolvedPrice: null,
            ruleApplied: null,
            quantity: params.quantity ?? null,
          },
        };
      }

      const resolvedFormatted = Number(resolved.price).toFixed(2);
      const savings = (Number(basePrice) - Number(resolvedFormatted)).toFixed(
        2,
      );
      const savingsPct = (
        ((Number(basePrice) - Number(resolvedFormatted)) / Number(basePrice)) *
        100
      ).toFixed(1);

      const ruleDesc =
        resolved.ruleType === "fixed"
          ? "fixed price rule"
          : resolved.ruleType === "percentage"
            ? "percentage discount"
            : "tiered/volume rule";

      const qtyNote = params.quantity ? ` for qty ${params.quantity}` : "";
      const savingsNote =
        Number(savings) > 0
          ? ` (saves ${currency} ${savings} / ${savingsPct}% vs base)`
          : " (same as base price)";

      return {
        success: true,
        message: `${productLabel} under "${listRow.name}"${qtyNote}: ${currency} ${resolvedFormatted}${savingsNote}. Rule: ${ruleDesc}. Base price: ${currency} ${basePrice}.`,
        data: {
          productId: productRow.id,
          productName: productRow.name,
          articleNumber: productRow.articleNumber,
          priceListId: listRow.id,
          priceListName: listRow.name,
          basePrice,
          resolvedPrice: resolvedFormatted,
          ruleType: resolved.ruleType,
          savings,
          savingsPct,
          quantity: params.quantity ?? null,
          currency,
        },
        actions: [
          {
            label: "View Price Lists",
            action: "navigate",
            params: { url: "/pricing" },
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to resolve price: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
