import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const getAccountBalancesSchema = z.object({
  accountType: z
    .enum(["asset", "liability", "equity", "revenue", "expense"])
    .optional()
    .describe("Filter by account type. If omitted, returns all account types."),
  dateFrom: z
    .string()
    .optional()
    .describe(
      "Start date for the period (ISO 8601, e.g. 2026-01-01). If omitted, includes all transactions.",
    ),
  dateTo: z
    .string()
    .optional()
    .describe(
      "End date for the period (ISO 8601, e.g. 2026-12-31). If omitted, includes all transactions up to now.",
    ),
});

export const getAccountBalancesTool: Tool = {
  name: "get_account_balances",
  description: `Get the trial balance showing all account balances with total debits, credits, and net balance. Can be filtered by account type (asset, liability, equity, revenue, expense) and date range. Only accounts with activity are shown.`,
  parameters: getAccountBalancesSchema,
  requiredPermissions: ["accounting:read"],
  execute: async (
    params: z.infer<typeof getAccountBalancesSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { getTrialBalance } = await import("@kivvi/core");
      const db = getDb(context);

      const balances = await getTrialBalance(db, context.companyId, params.dateFrom, params.dateTo);

      // Filter by account type if specified
      const filtered = params.accountType
        ? balances.filter((b) => b.type === params.accountType)
        : balances;

      if (filtered.length === 0) {
        return {
          success: true,
          message: "No accounts with activity found for the given criteria.",
          data: { accounts: [], count: 0 },
        };
      }

      // Group by type for structured output
      const grouped: Record<string, typeof filtered> = {};
      for (const balance of filtered) {
        if (!grouped[balance.type]) {
          grouped[balance.type] = [];
        }
        grouped[balance.type].push(balance);
      }

      const currency = context.defaultCurrency;

      const summary = Object.entries(grouped).map(([type, accounts]) => ({
        type,
        accounts: accounts.map((a) => ({
          code: a.code,
          name: a.name,
          debit: `${currency} ${a.totalDebit.toFixed(2)}`,
          credit: `${currency} ${a.totalCredit.toFixed(2)}`,
          balance: `${currency} ${a.balance.toFixed(2)}`,
        })),
        subtotal: `${currency} ${accounts.reduce((sum, a) => sum + a.balance, 0).toFixed(2)}`,
      }));

      const periodLabel =
        params.dateFrom || params.dateTo
          ? `${params.dateFrom || "beginning"} to ${params.dateTo || "now"}`
          : "all time";

      return {
        success: true,
        message: `Trial balance with ${filtered.length} active account(s) for period: ${periodLabel}.`,
        data: {
          period: periodLabel,
          groups: summary,
          totalAccounts: filtered.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get account balances: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
