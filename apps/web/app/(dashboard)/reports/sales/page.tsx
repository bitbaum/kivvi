import Link from "next/link";
import { ArrowLeft, BarChart3, FileText, TrendingUp } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getSalesReport } from "@kivvi/core";
import { formatCurrency } from "@/lib/utils";
import { DateRangeForm } from "../date-range-form";
import { ExportButton } from "../export-button";
import { EmptyState } from "@/components/empty-state";
import { getTranslations } from "next-intl/server";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SalesReportPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const ta = await getTranslations("accounting");

  const params = await searchParams;
  const now = new Date();
  const startDate = (params.start as string) || `${now.getFullYear()}-01-01`;
  const endDate = (params.end as string) || `${now.getFullYear()}-12-31`;

  const report = await getSalesReport(
    db,
    session.user.companyId,
    startDate,
    endDate,
  );

  const hasData = report.rows.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/reports"
          className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc("back")} {t("title")}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("salesReport")}</h1>
            <p className="text-muted-foreground">{t("salesReportDesc")}</p>
          </div>
          <ExportButton
            reportType="sales"
            startDate={startDate}
            endDate={endDate}
            disabled={!hasData}
          />
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="rounded-xl border bg-card p-4">
        <DateRangeForm defaultStart={startDate} defaultEnd={endDate} />
      </div>

      {!hasData ? (
        <EmptyState
          icon={TrendingUp}
          title={t("noSalesData")}
          description={t("noSalesDataDesc", { start: startDate, end: endDate })}
          actionLabel={tc("createInvoice")}
          actionHref="/sales/invoices/new"
          secondaryActionLabel={tc("adjustDateRange")}
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-4">
            <BarChart3 className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold">{t("monthlySales")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="sticky left-0 bg-card px-4 py-3 md:px-6">
                    {t("month")}
                  </th>
                  <th className="hidden px-4 py-3 text-right md:table-cell md:px-6">
                    {t("invoiceCount")}
                  </th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell md:px-6">
                    {t("revenueGross")}
                  </th>
                  <th className="hidden px-4 py-3 text-right md:table-cell md:px-6">
                    {t("vatAmount")}
                  </th>
                  <th className="hidden px-4 py-3 text-right md:table-cell md:px-6">
                    {t("creditNoteCount")}
                  </th>
                  <th className="hidden px-4 py-3 text-right md:table-cell md:px-6">
                    {tc("amount")}
                  </th>
                  <th className="px-4 py-3 text-right md:px-6">
                    {t("netRevenue")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.rows.map((row) => (
                  <tr key={row.month} className="hover:bg-muted/50">
                    <td className="sticky left-0 bg-card px-4 py-3 font-medium md:px-6">
                      {row.month}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell md:px-6">
                      {row.invoiceCount}
                    </td>
                    <td className="hidden px-4 py-3 text-right sm:table-cell md:px-6">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell md:px-6">
                      {formatCurrency(row.vatAmount)}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell md:px-6">
                      {row.creditNoteCount > 0 ? row.creditNoteCount : "-"}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-destructive md:table-cell md:px-6">
                      {Number(row.creditNoteAmount) > 0
                        ? `- ${formatCurrency(row.creditNoteAmount)}`
                        : "-"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium md:px-6 ${
                        Number(row.netRevenue) >= 0
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {formatCurrency(row.netRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="sticky left-0 bg-card px-4 py-3 md:px-6">
                    {tc("totals")}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell md:px-6">
                    {report.totals.invoiceCount}
                  </td>
                  <td className="hidden px-4 py-3 text-right sm:table-cell md:px-6">
                    {formatCurrency(report.totals.revenue)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell md:px-6">
                    {formatCurrency(report.totals.vatAmount)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell md:px-6">
                    {report.totals.creditNoteCount > 0
                      ? report.totals.creditNoteCount
                      : "-"}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-destructive md:table-cell md:px-6">
                    {Number(report.totals.creditNoteAmount) > 0
                      ? `- ${formatCurrency(report.totals.creditNoteAmount)}`
                      : "-"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-lg md:px-6 ${
                      Number(report.totals.netRevenue) >= 0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {formatCurrency(report.totals.netRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary Cards */}
          <div className="border-t p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  {ta("revenue")} {tc("total")}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {formatCurrency(report.totals.revenue)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("fromInvoices", { count: report.totals.invoiceCount })}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  {t("creditNoteCount")}
                </p>
                <p className="mt-1 text-xl font-bold text-destructive">
                  {Number(report.totals.creditNoteAmount) > 0
                    ? `- ${formatCurrency(report.totals.creditNoteAmount)}`
                    : formatCurrency(0)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("creditNotesCount", {
                    count: report.totals.creditNoteCount,
                  })}
                </p>
              </div>
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("netRevenue")}
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    Number(report.totals.netRevenue) >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {formatCurrency(report.totals.netRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
