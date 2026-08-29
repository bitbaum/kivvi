import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const getDashboardSummarySchema = z.object({});

export const getDashboardSummaryTool: Tool = {
  name: "get_dashboard_summary",
  description: `Get a comprehensive dashboard overview combining key financial statistics and actionable alerts. Includes revenue, outstanding invoices, overdue amounts, bank balances, contact/product counts, and alerts for items needing attention (overdue invoices, expiring quotes, low stock, unreconciled transactions).`,
  parameters: getDashboardSummarySchema,
  requiredPermissions: ["invoice:read"],
  execute: async (
    _params: z.infer<typeof getDashboardSummarySchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { getDashboardStats, getDashboardAlerts } = await import("@kivvi/core");
      const db = getDb(context);

      const [stats, alerts] = await Promise.all([
        getDashboardStats(db, context.companyId),
        getDashboardAlerts(db, context.companyId),
      ]);

      const currency = context.defaultCurrency;

      const formatStat = (stat: typeof stats.revenueThisMonth) => ({
        label: stat.labelKey,
        value: stat.type === "currency" ? `${currency} ${stat.value.toFixed(2)}` : stat.value,
        count: stat.count,
        changePercent: stat.changePercent,
      });

      const severityOrder = { urgent: 0, warning: 1, info: 2 };

      return {
        success: true,
        message: `Dashboard summary: ${currency} ${stats.revenueThisMonth.value.toFixed(2)} revenue this month, ${stats.overdueInvoices.count || 0} overdue invoice(s), ${alerts.length} alert(s).`,
        data: {
          stats: {
            revenueThisMonth: formatStat(stats.revenueThisMonth),
            revenueThisYear: formatStat(stats.revenueThisYear),
            outstandingInvoices: formatStat(stats.outstandingInvoices),
            overdueInvoices: formatStat(stats.overdueInvoices),
            draftDocuments: formatStat(stats.draftDocuments),
            bankBalance: formatStat(stats.bankBalance),
            activeContacts: formatStat(stats.activeContacts),
            activeProducts: formatStat(stats.activeProducts),
          },
          alerts: alerts
            .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
            .map((alert) => ({
              type: alert.type,
              severity: alert.severity,
              title: alert.titleKey,
              description: alert.descriptionKey,
              count: alert.count,
              amount: alert.amount ? `${currency} ${alert.amount.toFixed(2)}` : null,
              linkTo: alert.linkTo,
            })),
          alertCount: alerts.length,
          urgentAlertCount: alerts.filter((a) => a.severity === "urgent").length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get dashboard summary: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
