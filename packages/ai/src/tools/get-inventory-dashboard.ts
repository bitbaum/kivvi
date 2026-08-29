import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const getInventoryDashboardSchema = z.object({
  periodDays: z
    .number()
    .default(30)
    .describe("Number of days to look back for period metrics (default: 30)"),
});

export const getInventoryDashboardTool: Tool = {
  name: "get_inventory_dashboard",
  description:
    "Get business health metrics for the secondhand inventory: total inventory value, average margin, sell-through rate, days to sale, items by status, and recent sales with profit/loss. Use this when the user asks about inventory performance, margins, or business health.",
  parameters: getInventoryDashboardSchema,
  requiredPermissions: ["product:read"],
  execute: async (
    params: z.infer<typeof getInventoryDashboardSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { getInventoryDashboard, getImpactMetrics } = await import("@kivvi/core");
      const db = getDb(context);

      const [dashboard, impact] = await Promise.all([
        getInventoryDashboard(db, context.companyId, {
          periodDays: params.periodDays,
        }),
        getImpactMetrics(db, context.companyId),
      ]);

      const currency = context.defaultCurrency;

      return {
        success: true,
        message: `Inventory: ${dashboard.unsoldCount} items worth ${currency} ${dashboard.inventoryValue}. Avg margin: ${dashboard.averageMarginPercent}%. Sell-through: ${dashboard.sellThroughRate}%. ${dashboard.soldCount} sold / ${dashboard.intakeCount} received in last ${params.periodDays} days. Impact: ${impact.itemsReused} items reused, ~${impact.co2AvoidedKg} kg CO2 avoided.`,
        data: {
          inventory: {
            value: `${currency} ${dashboard.inventoryValue}`,
            unsoldCount: dashboard.unsoldCount,
            byStatus: dashboard.byStatus,
          },
          performance: {
            averageMargin: `${dashboard.averageMarginPercent}%`,
            totalProfit: `${currency} ${dashboard.totalProfit}`,
            sellThroughRate: `${dashboard.sellThroughRate}%`,
            avgDaysToSale: dashboard.avgDaysToSale,
          },
          period: {
            days: params.periodDays,
            sold: dashboard.soldCount,
            received: dashboard.intakeCount,
          },
          impact: {
            itemsReused: impact.itemsReused,
            co2AvoidedKg: impact.co2AvoidedKg,
            reuseRate: `${impact.reuseRatePercent}%`,
          },
        },
        actions: [
          {
            label: "View Dashboard",
            action: "navigate",
            params: { url: "/dashboard" },
          },
          {
            label: "View Inventory",
            action: "navigate",
            params: { url: "/intake/items" },
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get dashboard: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
