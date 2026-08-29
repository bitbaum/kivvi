import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const getReportSchema = z.object({
  reportType: z
    .enum(["profit_and_loss", "balance_sheet", "vat_report", "aging_report"])
    .describe("Type of financial report to generate."),
  startDate: z
    .string()
    .optional()
    .describe("Start date in ISO format (YYYY-MM-DD). Required for P&L and VAT reports."),
  endDate: z
    .string()
    .optional()
    .describe("End date in ISO format (YYYY-MM-DD). Required for P&L and VAT reports."),
});

function formatAmount(amount: string | number, currency: string): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  return `${currency} ${num.toFixed(2)}`;
}

export const getReportTool: Tool = {
  name: "get_report",
  description: `Generate financial reports: Profit & Loss (P&L), Balance Sheet, VAT Report, or Aging Report. Requires a date range for P&L and VAT reports.`,
  parameters: getReportSchema,
  requiredPermissions: ["accounting:read"],
  execute: async (
    params: z.infer<typeof getReportSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const db = getDb(context);
      const currency = context.defaultCurrency;
      const { reportType, startDate, endDate } = params;

      // Validate date range for reports that require it
      if (
        (reportType === "profit_and_loss" || reportType === "vat_report") &&
        (!startDate || !endDate)
      ) {
        return {
          success: false,
          error: `Start date and end date are required for ${reportType === "profit_and_loss" ? "Profit & Loss" : "VAT"} reports.`,
        };
      }

      const { getProfitAndLoss, getBalanceSheet, getVatReport, getAgingReport } =
        await import("@kivvi/core");

      switch (reportType) {
        case "profit_and_loss": {
          const report = await getProfitAndLoss(db, context.companyId, startDate!, endDate!);

          return {
            success: true,
            message: `Profit & Loss report for ${report.periodStart} to ${report.periodEnd}.`,
            data: {
              reportType: "Profit & Loss (Erfolgsrechnung)",
              periodStart: report.periodStart,
              periodEnd: report.periodEnd,
              totalRevenue: formatAmount(report.totalRevenue, currency),
              totalExpenses: formatAmount(report.totalExpenses, currency),
              netIncome: formatAmount(report.netIncome, currency),
              revenueAccounts: report.revenue.map((r) => ({
                code: r.accountCode,
                name: r.accountName,
                amount: formatAmount(r.amount, currency),
              })),
              expenseAccounts: report.expenses.map((r) => ({
                code: r.accountCode,
                name: r.accountName,
                amount: formatAmount(r.amount, currency),
              })),
            },
          };
        }

        case "balance_sheet": {
          const asOfDate = endDate || new Date().toISOString().split("T")[0];
          const report = await getBalanceSheet(db, context.companyId, asOfDate);

          return {
            success: true,
            message: `Balance Sheet as of ${report.asOfDate}.`,
            data: {
              reportType: "Balance Sheet (Bilanz)",
              asOfDate: report.asOfDate,
              totalAssets: formatAmount(report.totalAssets, currency),
              totalLiabilities: formatAmount(report.totalLiabilities, currency),
              totalEquity: formatAmount(report.totalEquity, currency),
              retainedEarnings: formatAmount(report.retainedEarnings, currency),
              assets: report.assets.map((r) => ({
                code: r.accountCode,
                name: r.accountName,
                balance: formatAmount(r.balance, currency),
              })),
              liabilities: report.liabilities.map((r) => ({
                code: r.accountCode,
                name: r.accountName,
                balance: formatAmount(r.balance, currency),
              })),
              equity: report.equity.map((r) => ({
                code: r.accountCode,
                name: r.accountName,
                balance: formatAmount(r.balance, currency),
              })),
            },
          };
        }

        case "vat_report": {
          const report = await getVatReport(db, context.companyId, startDate!, endDate!);

          return {
            success: true,
            message: `VAT Report for ${report.periodStart} to ${report.periodEnd}.`,
            data: {
              reportType: "VAT Report (MWST-Abrechnung)",
              periodStart: report.periodStart,
              periodEnd: report.periodEnd,
              totalSalesVat: formatAmount(report.totalSalesVat, currency),
              totalPurchaseVat: formatAmount(report.totalPurchaseVat, currency),
              netVatPayable: formatAmount(report.vatPayable, currency),
              salesVatByRate: report.salesVat.map((r) => ({
                rate: `${r.rate}%`,
                taxableAmount: formatAmount(r.taxableAmount, currency),
                vatAmount: formatAmount(r.vatAmount, currency),
                documentCount: r.documentCount,
              })),
              purchaseVatByRate: report.purchaseVat.map((r) => ({
                rate: `${r.rate}%`,
                taxableAmount: formatAmount(r.taxableAmount, currency),
                vatAmount: formatAmount(r.vatAmount, currency),
                documentCount: r.documentCount,
              })),
            },
          };
        }

        case "aging_report": {
          const asOfDate = endDate || new Date().toISOString().split("T")[0];
          const report = await getAgingReport(db, context.companyId, asOfDate);

          return {
            success: true,
            message: `Aging Report as of ${report.asOfDate}.`,
            data: {
              reportType: "Aging Report (Altersanalyse)",
              asOfDate: report.asOfDate,
              summary: {
                current: formatAmount(report.totals.current, currency),
                overdue30Days: formatAmount(report.totals.days30, currency),
                overdue60Days: formatAmount(report.totals.days60, currency),
                overdue90Days: formatAmount(report.totals.days90, currency),
                overdue90Plus: formatAmount(report.totals.over90, currency),
                totalOutstanding: formatAmount(report.totals.total, currency),
              },
              byContact: report.rows.map((r) => ({
                contactName: r.contactName,
                current: formatAmount(r.current, currency),
                overdue30Days: formatAmount(r.days30, currency),
                overdue60Days: formatAmount(r.days60, currency),
                overdue90Days: formatAmount(r.days90, currency),
                overdue90Plus: formatAmount(r.over90, currency),
                total: formatAmount(r.total, currency),
              })),
            },
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate report: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
