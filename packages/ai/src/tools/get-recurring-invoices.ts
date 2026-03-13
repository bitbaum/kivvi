import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const getRecurringInvoicesSchema = z.object({
  activeOnly: z
    .boolean()
    .default(true)
    .describe(
      "If true (default), only show active recurring configurations. Set to false to include inactive ones.",
    ),
});

export const getRecurringInvoicesTool: Tool = {
  name: "get_recurring_invoices",
  description: `List all recurring invoice configurations. Shows which orders have recurring invoicing set up, their periodicity (monthly, quarterly, annual), next generation date, and status.`,
  parameters: getRecurringInvoicesSchema,
  requiredPermissions: ["invoice:read"],
  execute: async (
    params: z.infer<typeof getRecurringInvoicesSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { listRecurringConfigs } = await import("@kivvi/core");
      const db = getDb(context);

      const configs = await listRecurringConfigs(db, context.companyId);

      // Filter by active status if requested
      const filtered = params.activeOnly
        ? configs.filter((c) => c.isActive)
        : configs;

      if (filtered.length === 0) {
        return {
          success: true,
          message: params.activeOnly
            ? "No active recurring invoice configurations found."
            : "No recurring invoice configurations found.",
          data: { configs: [], count: 0 },
        };
      }

      const periodicityLabels: Record<string, string> = {
        monthly: "Monthly",
        quarterly: "Quarterly",
        annual: "Annual",
      };

      return {
        success: true,
        message: `Found ${filtered.length} recurring invoice configuration(s).`,
        data: {
          configs: filtered.map((c) => ({
            id: c.id,
            orderNumber: c.orderNumber,
            contactName: c.contactName,
            periodicity: periodicityLabels[c.periodicity] || c.periodicity,
            isActive: c.isActive,
            startDate: c.startDate,
            endDate: c.endDate || "No end date",
            nextGenerationDate: c.nextGenerationDate,
            lastGeneratedDate: c.lastGeneratedDate || "Never generated",
            emailRecipients: c.emailRecipients || [],
          })),
          count: filtered.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list recurring invoices: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
