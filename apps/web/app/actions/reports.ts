"use server";

import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { getSession, safeErrorMessage } from "./utils";
import { getTranslations } from "next-intl/server";
import {
  getProfitAndLoss,
  getBalanceSheet,
  getVatReport,
  getAgingReport,
  getSalesReport,
} from "@kivvi/core";
import type { ActionResult } from "./utils";

export interface ExportReportParams {
  reportType: "profit-loss" | "balance-sheet" | "vat" | "aging" | "sales";
  format: "csv";
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
}

/**
 * Export a report to CSV format.
 * Returns the CSV data as a string for client-side download.
 */
export async function exportReportAction(
  params: ExportReportParams,
): Promise<ActionResult<{ csvData: string; filename: string }>> {
  const t = await getTranslations("reports");
  try {
    const { companyId } = await getSession();

    let csvData: string;
    let filename: string;

    switch (params.reportType) {
      case "profit-loss": {
        if (!params.startDate || !params.endDate) {
          return {
            success: false,
            error: t("errorDateRangeRequired"),
          };
        }

        const report = await getProfitAndLoss(db, companyId, params.startDate, params.endDate);

        // Generate CSV
        const rows: string[] = ["Account Code,Account Name,Type,Amount"];

        // Revenue section
        report.revenue.forEach((row) => {
          rows.push(`${row.accountCode},"${row.accountName}",Revenue,${row.amount}`);
        });
        rows.push(`,,Total Revenue,${report.totalRevenue}`);
        rows.push(""); // Empty row

        // Expenses section
        report.expenses.forEach((row) => {
          rows.push(`${row.accountCode},"${row.accountName}",Expense,${row.amount}`);
        });
        rows.push(`,,Total Expenses,${report.totalExpenses}`);
        rows.push(""); // Empty row
        rows.push(`,,Net Income,${report.netIncome}`);

        csvData = rows.join("\n");
        filename = `profit-loss-${params.startDate}-${params.endDate}.csv`;
        break;
      }

      case "balance-sheet": {
        if (!params.asOfDate) {
          return { success: false, error: t("errorAsOfDateRequired") };
        }

        const report = await getBalanceSheet(db, companyId, params.asOfDate);

        const rows: string[] = ["Account Code,Account Name,Type,Amount"];

        // Assets
        report.assets.forEach((row) => {
          rows.push(`${row.accountCode},"${row.accountName}",Asset,${row.balance}`);
        });
        rows.push(`,,Total Assets,${report.totalAssets}`);
        rows.push(""); // Empty row

        // Liabilities
        report.liabilities.forEach((row) => {
          rows.push(`${row.accountCode},"${row.accountName}",Liability,${row.balance}`);
        });
        rows.push(`,,Total Liabilities,${report.totalLiabilities}`);
        rows.push(""); // Empty row

        // Equity
        report.equity.forEach((row) => {
          rows.push(`${row.accountCode},"${row.accountName}",Equity,${row.balance}`);
        });
        rows.push(`,,Total Equity,${report.totalEquity}`);

        csvData = rows.join("\n");
        filename = `balance-sheet-${params.asOfDate}.csv`;
        break;
      }

      case "vat": {
        if (!params.startDate || !params.endDate) {
          return {
            success: false,
            error: t("errorDateRangeRequired"),
          };
        }

        const report = await getVatReport(db, companyId, params.startDate, params.endDate);

        const rows: string[] = ["Type,Rate,Taxable Amount,VAT Amount,Document Count"];

        // Sales VAT
        rows.push("Sales VAT");
        report.salesVat.forEach((row) => {
          rows.push(
            `Sales,${row.rate}%,${row.taxableAmount},${row.vatAmount},${row.documentCount}`,
          );
        });

        const totalSalesTaxable = report.salesVat
          .reduce((sum, row) => sum.plus(row.taxableAmount), new Decimal(0))
          .toNumber();
        rows.push(`Sales Total,,${totalSalesTaxable},${report.totalSalesVat},`);
        rows.push(""); // Empty row

        // Purchase VAT
        rows.push("Purchase VAT");
        report.purchaseVat.forEach((row) => {
          rows.push(
            `Purchase,${row.rate}%,${row.taxableAmount},${row.vatAmount},${row.documentCount}`,
          );
        });

        const totalPurchaseTaxable = report.purchaseVat
          .reduce((sum, row) => sum.plus(row.taxableAmount), new Decimal(0))
          .toNumber();
        rows.push(`Purchase Total,,${totalPurchaseTaxable},${report.totalPurchaseVat},`);
        rows.push(""); // Empty row

        rows.push(`VAT Payable,,,${report.vatPayable},`);

        csvData = rows.join("\n");
        filename = `vat-report-${params.startDate}-${params.endDate}.csv`;
        break;
      }

      case "aging": {
        if (!params.asOfDate) {
          return { success: false, error: t("errorAsOfDateRequired") };
        }

        const report = await getAgingReport(db, companyId, params.asOfDate);

        const rows: string[] = [
          "Contact Name,Current,1-30 Days,31-60 Days,61-90 Days,90+ Days,Total Outstanding",
        ];

        report.rows.forEach((row) => {
          rows.push(
            `"${row.contactName}",${row.current},${row.days30},${row.days60},${row.days90},${row.over90},${row.total}`,
          );
        });

        rows.push(
          `TOTALS,${report.totals.current},${report.totals.days30},${report.totals.days60},${report.totals.days90},${report.totals.over90},${report.totals.total}`,
        );

        csvData = rows.join("\n");
        filename = `aging-report-${params.asOfDate}.csv`;
        break;
      }

      case "sales": {
        if (!params.startDate || !params.endDate) {
          return {
            success: false,
            error: t("errorDateRangeRequired"),
          };
        }

        const report = await getSalesReport(db, companyId, params.startDate, params.endDate);

        const rows: string[] = ["Month,Revenue"];

        report.rows.forEach((row) => {
          rows.push(`${row.month},${row.revenue}`);
        });

        rows.push(`TOTAL,${report.totals.revenue}`);

        csvData = rows.join("\n");
        filename = `sales-report-${params.startDate}-${params.endDate}.csv`;
        break;
      }

      default:
        return { success: false, error: t("errorInvalidReportType") };
    }

    return {
      success: true,
      data: { csvData, filename },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorExportFailed")),
    };
  }
}
