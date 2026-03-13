import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const processDunningSchema = z.object({
  invoiceId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "UUID of a specific invoice to create a dunning notice for. If omitted, returns all overdue invoices with their dunning status.",
    ),
});

export const processDunningTool: Tool = {
  name: "process_dunning",
  description: `Manage dunning (payment reminders) for overdue invoices. Without an invoice ID, lists all overdue invoices with their current dunning level and days overdue. With an invoice ID, creates a dunning notice and escalates the invoice to the next dunning level (overdue -> dunning_1 -> dunning_2 -> dunning_3).`,
  parameters: processDunningSchema,
  requiredPermissions: ["invoice:write"],
  execute: async (
    params: z.infer<typeof processDunningSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const db = getDb(context);

      if (params.invoiceId) {
        // Create dunning for a specific invoice
        const { createDunning } = await import("@kivvi/core");

        const { dunningDoc, newLevel } = await createDunning(
          db,
          context.companyId,
          context.userId,
          params.invoiceId,
        );

        const levelLabels: Record<string, string> = {
          dunning_1: "1st Reminder",
          dunning_2: "2nd Reminder",
          dunning_3: "Final Reminder",
        };

        return {
          success: true,
          message: `Created dunning notice ${dunningDoc.number} (${levelLabels[newLevel] || newLevel}). Invoice escalated to ${newLevel}.`,
          data: {
            dunningId: dunningDoc.id,
            dunningNumber: dunningDoc.number,
            invoiceId: params.invoiceId,
            newLevel,
            levelLabel: levelLabels[newLevel] || newLevel,
            outstandingAmount: `${dunningDoc.currency} ${Number(dunningDoc.total).toFixed(2)}`,
          },
          actions: [
            {
              label: "View Dunning Notice",
              action: "navigate",
              params: { url: `/sales/${dunningDoc.id}` },
              variant: "primary",
            },
          ],
        };
      }

      // List all overdue invoices with dunning status
      const { detectOverdueInvoices, getDunningStats } =
        await import("@kivvi/core");

      const [overdue, stats] = await Promise.all([
        detectOverdueInvoices(db, context.companyId),
        getDunningStats(db, context.companyId),
      ]);

      if (overdue.length === 0) {
        return {
          success: true,
          message: "No overdue invoices found. All invoices are current.",
          data: { invoices: [], stats: { totalOverdue: 0 } },
        };
      }

      const currency = context.defaultCurrency;

      return {
        success: true,
        message: `${overdue.length} overdue invoice(s) totaling ${currency} ${stats.totalOverdueAmount.toFixed(2)}.`,
        data: {
          invoices: overdue.map((inv) => ({
            id: inv.id,
            number: inv.number,
            contactName: inv.contactName || "Unknown",
            total: `${currency} ${Number(inv.total).toFixed(2)}`,
            dueDate: new Date(inv.dueDate).toISOString().split("T")[0],
            daysOverdue: inv.daysOverdue,
            dunningLevel: inv.dunningLevel,
            status: inv.status,
          })),
          stats: {
            totalOverdue: stats.totalOverdue,
            totalAmount: `${currency} ${stats.totalOverdueAmount.toFixed(2)}`,
            noDunning: stats.level0Count,
            level1: stats.level1Count,
            level2: stats.level2Count,
            level3: stats.level3Count,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to process dunning: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
