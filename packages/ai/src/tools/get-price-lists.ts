import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const getPriceListsSchema = z.object({
  include_rules: z
    .boolean()
    .default(false)
    .describe(
      "When true, returns each list with its full set of pricing rules. When false (default), returns list names and metadata only.",
    ),
  list_name: z
    .string()
    .optional()
    .describe("Optional partial name filter to narrow results (e.g. 'wholesale', 'student')"),
});

export const getPriceListsTool: Tool = {
  name: "get_price_lists",
  description: `List all price lists for the company. With include_rules: true, also returns each list's pricing rules (fixed prices, percentage discounts, tiered/volume rules).

Examples:
- "Show me all price lists" → include_rules: false
- "What pricing rules are in the wholesale list?" → include_rules: true, list_name: "wholesale"
- "Show the student discount list with all its rules" → include_rules: true, list_name: "student"`,
  parameters: getPriceListsSchema,
  requiredPermissions: ["product:read"],
  execute: async (
    params: z.infer<typeof getPriceListsSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { listPriceLists, getPriceList } = await import("@kivvi/core/src/domain/pricing");
      const db = getDb(context);

      let lists = await listPriceLists(db, context.companyId);

      if (params.list_name) {
        const query = params.list_name.toLowerCase();
        lists = lists.filter((l) => l.name.toLowerCase().includes(query));
      }

      if (lists.length === 0) {
        return {
          success: true,
          message: params.list_name
            ? `No price lists found matching "${params.list_name}".`
            : "No price lists have been created yet.",
          data: { lists: [] },
          actions: [
            {
              label: "Manage Price Lists",
              action: "navigate",
              params: { url: "/pricing" },
              variant: "primary",
            },
          ],
        };
      }

      if (!params.include_rules) {
        const lines = lists.map(
          (l) => `• ${l.name} (${l.currency})${l.isDefault ? " — default" : ""}`,
        );
        return {
          success: true,
          message: `${lists.length} price list${lists.length === 1 ? "" : "s"}:\n${lines.join("\n")}`,
          data: {
            lists: lists.map((l) => ({
              id: l.id,
              name: l.name,
              currency: l.currency,
              isDefault: l.isDefault,
            })),
          },
          actions: [
            {
              label: "Manage Price Lists",
              action: "navigate",
              params: { url: "/pricing" },
            },
          ],
        };
      }

      // Fetch full rules for each matched list
      const listsWithRules = await Promise.all(
        lists.map((l) => getPriceList(db, context.companyId, l.id)),
      );

      const formatted = listsWithRules
        .filter(Boolean)
        .map((list) => {
          if (!list) return null;
          const ruleLines = list.rules.map((r) => {
            const scope = r.productName
              ? `${r.productName}${r.productSku ? ` (${r.productSku})` : ""}`
              : "all products";
            const ruleDesc =
              r.type === "fixed"
                ? `fixed ${list.currency} ${r.value}`
                : r.type === "percentage"
                  ? `${r.value}% discount`
                  : `${r.value}% tiered (min qty ${r.minQuantity ?? "—"})`;
            const dates =
              r.validFrom || r.validTo ? ` [${r.validFrom ?? "∞"} – ${r.validTo ?? "∞"}]` : "";
            return `  – ${scope}: ${ruleDesc}${dates}`;
          });
          const header = `${list.name} (${list.currency})${list.isDefault ? " — default" : ""}`;
          return {
            text:
              ruleLines.length > 0
                ? `${header}\n${ruleLines.join("\n")}`
                : `${header}\n  (no rules)`,
            data: list,
          };
        })
        .filter(Boolean);

      return {
        success: true,
        message: formatted.map((f) => f!.text).join("\n\n"),
        data: {
          lists: formatted.map((f) => f!.data),
        },
        actions: [
          {
            label: "Manage Price Lists",
            action: "navigate",
            params: { url: "/pricing" },
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch price lists: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
