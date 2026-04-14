import Link from "next/link";
import { ArrowLeft, TrendingUp, FileText, Calendar } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getProfitAndLoss } from "@kivvi/core";
import { formatCurrency } from "@/lib/utils";
import { DateRangeForm } from "../date-range-form";
import { ExportButton } from "../export-button";
import { EmptyState } from "@/components/empty-state";
import { getTranslations } from "next-intl/server";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProfitLossPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const ta = await getTranslations("accounting");

  const params = await searchParams;
  const now = new Date();
  const startDate = (params.start as string) || `${now.getFullYear()}-01-01`;
  const endDate = (params.end as string) || `${now.getFullYear()}-12-31`;

  const report = await getProfitAndLoss(
    db,
    session.user.companyId,
    startDate,
    endDate,
  );

  const hasData = report.revenue.length > 0 || report.expenses.length > 0;

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
            <h1 className="text-3xl font-bold">{t("profitAndLoss")}</h1>
            <p className="text-muted-foreground">{t("profitAndLossDesc")}</p>
          </div>
          <ExportButton
            reportType="profit-loss"
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
          icon={Calendar}
          title={t("noDataForPeriod")}
          description={t("noJournalEntriesBetween", {
            start: startDate,
            end: endDate,
          })}
          actionLabel={tc("adjustDateRange")}
          secondaryActionLabel={tc("viewDashboard")}
          secondaryActionHref="/dashboard"
        />
      ) : (
        <>
          {/* Revenue Section */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b p-4">
              <TrendingUp className="h-5 w-5 text-success" />
              <h2 className="font-semibold">{ta("revenue")}</h2>
            </div>
            {report.revenue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3">{ta("account")}</th>
                      <th className="px-6 py-3">{tc("name")}</th>
                      <th className="px-6 py-3 text-right">{tc("amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.revenue.map((row) => (
                      <tr key={row.accountCode} className="hover:bg-muted/50">
                        <td className="px-6 py-3 font-mono text-muted-foreground">
                          {row.accountCode}
                        </td>
                        <td className="px-6 py-3">{row.accountName}</td>
                        <td className="px-6 py-3 text-right font-medium">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="px-6 py-3" colSpan={2}>
                        {ta("revenue")} {tc("total")}
                      </td>
                      <td className="px-6 py-3 text-right text-success">
                        {formatCurrency(report.totalRevenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                {t("noRevenueEntries")}
              </p>
            )}
          </div>

          {/* Expenses Section */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b p-4">
              <TrendingUp className="h-5 w-5 rotate-180 text-destructive" />
              <h2 className="font-semibold">{ta("expenses")}</h2>
            </div>
            {report.expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3">{ta("account")}</th>
                      <th className="px-6 py-3">{tc("name")}</th>
                      <th className="px-6 py-3 text-right">{tc("amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.expenses.map((row) => (
                      <tr key={row.accountCode} className="hover:bg-muted/50">
                        <td className="px-6 py-3 font-mono text-muted-foreground">
                          {row.accountCode}
                        </td>
                        <td className="px-6 py-3">{row.accountName}</td>
                        <td className="px-6 py-3 text-right font-medium">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="px-6 py-3" colSpan={2}>
                        {ta("expenses")} {tc("total")}
                      </td>
                      <td className="px-6 py-3 text-right text-destructive">
                        {formatCurrency(report.totalExpenses)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                {t("noExpenseEntries")}
              </p>
            )}
          </div>

          {/* Net Income Summary */}
          <div className="rounded-xl border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  {ta("revenue")} {tc("total")}
                </p>
                <p className="mt-1 text-xl font-bold text-success">
                  {formatCurrency(report.totalRevenue)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  {ta("expenses")} {tc("total")}
                </p>
                <p className="mt-1 text-xl font-bold text-destructive">
                  {formatCurrency(report.totalExpenses)}
                </p>
              </div>
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("netIncome")}
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    Number(report.netIncome) >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {formatCurrency(report.netIncome)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
