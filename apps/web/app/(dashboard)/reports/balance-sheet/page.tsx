import Link from "next/link";
import { ArrowLeft, Scale, FileText, BookOpen } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getBalanceSheet } from "@kivvi/core";
import { formatCurrency } from "@/lib/utils";
import { DatePickerForm } from "../date-picker-form";
import { ExportButton } from "../export-button";
import { EmptyState } from "@/components/empty-state";
import { getTranslations } from "next-intl/server";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BalanceSheetPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const ta = await getTranslations("accounting");

  const params = await searchParams;
  const asOfDate =
    (params.asOfDate as string) || new Date().toISOString().split("T")[0];

  const report = await getBalanceSheet(db, session.user.companyId, asOfDate);

  const hasData =
    report.assets.length > 0 ||
    report.liabilities.length > 0 ||
    report.equity.length > 0;

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
            <h1 className="text-3xl font-bold">{t("balanceSheet")}</h1>
            <p className="text-muted-foreground">{t("balanceSheetDesc")}</p>
          </div>
          <ExportButton
            reportType="balance-sheet"
            asOfDate={asOfDate}
            disabled={!hasData}
          />
        </div>
      </div>

      {/* Date Picker */}
      <div className="rounded-xl border bg-card p-4">
        <DatePickerForm defaultDate={asOfDate} />
      </div>

      {!hasData ? (
        <EmptyState
          icon={BookOpen}
          title={t("noDataAvailable")}
          description={t("noJournalEntriesAsOf", { date: asOfDate })}
          actionLabel={tc("viewAccounting")}
          actionHref="/accounting"
          secondaryActionLabel={tc("viewDashboard")}
          secondaryActionHref="/dashboard"
        />
      ) : (
        <>
          {/* Assets */}
          <BalanceSection
            title={ta("assets")}
            rows={report.assets}
            total={report.totalAssets}
            color="text-blue-600 dark:text-blue-400"
            labels={{
              account: ta("account"),
              name: tc("name"),
              balance: ta("balance"),
              total: tc("total"),
              noRecords: t("noDataAvailable"),
            }}
          />

          {/* Liabilities */}
          <BalanceSection
            title={ta("liabilities")}
            rows={report.liabilities}
            total={report.totalLiabilities}
            color="text-red-600 dark:text-red-400"
            labels={{
              account: ta("account"),
              name: tc("name"),
              balance: ta("balance"),
              total: tc("total"),
              noRecords: t("noDataAvailable"),
            }}
          />

          {/* Equity */}
          <BalanceSection
            title={ta("equity")}
            rows={report.equity}
            total={report.totalEquity}
            color="text-purple-600 dark:text-purple-400"
            labels={{
              account: ta("account"),
              name: tc("name"),
              balance: ta("balance"),
              total: tc("total"),
              noRecords: t("noDataAvailable"),
            }}
          />

          {/* Balance Check */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">{ta("balanceCheck")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  {t("totalAssets")}
                </p>
                <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(report.totalAssets)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  {t("totalLiabilitiesAndEquity")}
                </p>
                <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(report.totalLiabilities)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  {ta("equity")} {tc("total")}
                </p>
                <p className="mt-1 text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(report.totalEquity)}
                </p>
              </div>
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {ta("retainedEarnings")}
                </p>
                <p
                  className={`mt-1 text-xl font-bold ${
                    Number(report.retainedEarnings) >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatCurrency(report.retainedEarnings)}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {t("balanceEquation", {
                assets: formatCurrency(report.totalAssets),
                liabilities: formatCurrency(report.totalLiabilities),
                equity: formatCurrency(report.totalEquity),
                earnings: formatCurrency(report.retainedEarnings),
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BalanceSection({
  title,
  rows,
  total,
  color,
  labels,
}: {
  title: string;
  rows: { accountCode: string; accountName: string; balance: string }[];
  total: string;
  color: string;
  labels: {
    account: string;
    name: string;
    balance: string;
    total: string;
    noRecords: string;
  };
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b p-4">
        <Scale className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">{labels.account}</th>
                <th className="px-6 py-3">{labels.name}</th>
                <th className="px-6 py-3 text-right">{labels.balance}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.accountCode} className="hover:bg-muted/50">
                  <td className="px-6 py-3 font-mono text-muted-foreground">
                    {row.accountCode}
                  </td>
                  <td className="px-6 py-3">{row.accountName}</td>
                  <td className="px-6 py-3 text-right font-medium">
                    {formatCurrency(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold">
                <td className="px-6 py-3" colSpan={2}>
                  {labels.total} {title}
                </td>
                <td className={`px-6 py-3 text-right ${color}`}>
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="p-6 text-sm text-muted-foreground">{labels.noRecords}</p>
      )}
    </div>
  );
}
