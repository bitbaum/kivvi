import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const findUninvoicedRepairLaborSchema = z.object({
  limit: z.number().default(20).describe("Maximum number of items to return"),
});

export const findUninvoicedRepairLaborTool: Tool = {
  name: "find_uninvoiced_repair_labor",
  description: `Find inventory items with logged repair hours that are still in stock and have not yet been billed for labor — silent revenue leakage. Returns each item, its hours, and a suggested labor amount (using the company default repair rate). ADVISORY: it does not create invoices; use create_repair_labor via the item to actually bill.`,
  parameters: findUninvoicedRepairLaborSchema,
  requiredPermissions: ["product:read"],
  execute: async (
    params: z.infer<typeof findUninvoicedRepairLaborSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const db = getDb(context);
      const { findUninvoicedRepairLabor } = await import("@kivvi/core");
      const report = await findUninvoicedRepairLabor(db, context.companyId);

      const currency = context.defaultCurrency;
      const items = report.items.slice(0, params.limit).map((i) => ({
        itemId: i.itemId,
        itemNumber: i.itemNumber,
        description: i.description,
        status: i.status,
        repairHours: i.repairHours,
        suggestedAmount: i.suggestedAmount ? `${currency} ${i.suggestedAmount}` : null,
      }));

      if (items.length === 0) {
        return {
          success: true,
          message:
            "No uninvoiced repair labor found — every item with logged hours is either sold or already billed.",
          data: { items: [], count: 0 },
        };
      }

      const totalPhrase = report.totalSuggestedAmount
        ? ` Total suggested labor: ${currency} ${report.totalSuggestedAmount}.`
        : " No default repair rate is configured, so amounts can't be suggested — set one in company settings.";

      return {
        success: true,
        message: `Found ${report.items.length} item(s) with ${report.totalHours}h of unbilled repair labor.${totalPhrase}`,
        data: {
          items,
          count: items.length,
          totalAvailable: report.items.length,
          totalHours: report.totalHours,
          hourlyRate: report.hourlyRate,
          totalSuggestedAmount: report.totalSuggestedAmount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to find uninvoiced repair labor: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
