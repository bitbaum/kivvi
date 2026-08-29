import { z } from "zod";
import Decimal from "decimal.js";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const listOverdueInvoicesSchema = z.object({
  limit: z.number().default(20).describe("Maximum number of results to return"),
});

export const listOverdueInvoicesTool: Tool = {
  name: "list_overdue_invoices",
  description: `List all overdue invoices with dunning statistics. Shows which invoices are past due, how many days overdue, current dunning level, and total outstanding amounts.`,
  parameters: listOverdueInvoicesSchema,
  requiredPermissions: ["invoice:read"],
  execute: async (
    params: z.infer<typeof listOverdueInvoicesSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const db = getDb(context);

      const { detectOverdueInvoices, getDunningStats } = await import("@kivvi/core");

      const [overdueInvoices, stats] = await Promise.all([
        detectOverdueInvoices(db, context.companyId),
        getDunningStats(db, context.companyId),
      ]);

      const currency = context.defaultCurrency;

      const invoiceList = overdueInvoices.slice(0, params.limit).map((inv) => ({
        id: inv.id,
        number: inv.number,
        contactName: inv.contactName || "Unknown",
        dueDate: inv.dueDate.toISOString().split("T")[0],
        daysOverdue: inv.daysOverdue,
        total: `${currency} ${new Decimal(inv.total).toFixed(2)}`,
        status: inv.status,
        dunningLevel: inv.dunningLevel,
      }));

      if (invoiceList.length === 0) {
        return {
          success: true,
          message: "No overdue invoices found. All invoices are paid or within their due dates.",
          data: {
            invoices: [],
            count: 0,
            summary: {
              totalOverdue: 0,
              totalOverdueAmount: `${currency} 0.00`,
              byDunningLevel: {
                noDunning: 0,
                level1: 0,
                level2: 0,
                level3: 0,
              },
            },
          },
        };
      }

      return {
        success: true,
        message: `Found ${stats.totalOverdue} overdue invoice(s) with a total outstanding amount of ${currency} ${new Decimal(stats.totalOverdueAmount).toFixed(2)}.`,
        data: {
          invoices: invoiceList,
          count: invoiceList.length,
          totalAvailable: stats.totalOverdue,
          summary: {
            totalOverdue: stats.totalOverdue,
            totalOverdueAmount: `${currency} ${new Decimal(stats.totalOverdueAmount).toFixed(2)}`,
            byDunningLevel: {
              noDunning: stats.level0Count,
              level1: stats.level1Count,
              level2: stats.level2Count,
              level3: stats.level3Count,
            },
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list overdue invoices: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
