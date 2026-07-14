import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getAccountStatement } from "@kivvi/core";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { FileText } from "lucide-react";

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}

export default async function AccountStatementPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("accounting");
  const tc = await getTranslations("common");

  const { code } = await params;
  const sp = await searchParams;
  const year = new Date().getFullYear();
  const dateFrom = sp.dateFrom || `${year}-01-01`;
  const dateTo = sp.dateTo || `${year}-12-31`;

  let statement: Awaited<ReturnType<typeof getAccountStatement>> | null = null;
  try {
    statement = await getAccountStatement(db, session.user.companyId, {
      accountCode: code,
      dateFrom,
      dateTo,
    });
  } catch {
    statement = null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/accounting/chart-of-accounts"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            <span className="font-mono">{code}</span>
            {statement && (
              <span className="ml-3 text-xl font-medium text-muted-foreground">
                {statement.accountName}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">{t("accountStatement")}</p>
        </div>
      </div>

      {!statement ? (
        <EmptyState
          icon={FileText}
          title={tc("noResults")}
          description={code}
        />
      ) : (
        <>
          {/* Period filter */}
          <form
            className="flex flex-wrap items-end gap-3"
            action={`/accounting/accounts/${code}`}
            method="GET"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {tc("from")}
              </label>
              <input
                type="date"
                name="dateFrom"
                defaultValue={dateFrom}
                className="rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {tc("to")}
              </label>
              <input
                type="date"
                name="dateTo"
                defaultValue={dateTo}
                className="rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              {tc("apply")}
            </button>
          </form>

          {/* Statement table */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <div className="grid min-w-[820px] grid-cols-[110px_140px_1fr_130px_130px_150px] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div>{tc("date")}</div>
              <div>{t("reference")}</div>
              <div>{tc("description")}</div>
              <div className="text-right">{t("debit")}</div>
              <div className="text-right">{t("credit")}</div>
              <div className="text-right">{t("runningBalance")}</div>
            </div>

            {/* Opening balance */}
            <div className="grid min-w-[820px] grid-cols-[110px_140px_1fr_130px_130px_150px] gap-4 border-b bg-muted/40 px-6 py-3 text-sm">
              <div className="col-span-3 font-medium">
                {t("openingBalance")}
              </div>
              <div />
              <div />
              <div className="text-right font-mono font-medium">
                {formatCurrency(statement.openingBalance)}
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {statement.rows.map((row) => (
                <div
                  key={row.entryId + row.runningBalance}
                  className="grid min-w-[820px] grid-cols-[110px_140px_1fr_130px_130px_150px] gap-4 px-6 py-3 text-sm hover:bg-muted/50 transition-colors"
                >
                  <div>{formatDate(row.date)}</div>
                  <div className="font-mono text-xs">
                    <Link
                      href={`/accounting/journal/${row.entryId}`}
                      className="text-primary hover:underline"
                    >
                      {row.reference ?? "—"}
                    </Link>
                  </div>
                  <div className="truncate">{row.description ?? "—"}</div>
                  <div className="text-right font-mono">
                    {row.debit ? formatCurrency(row.debit) : ""}
                  </div>
                  <div className="text-right font-mono">
                    {row.credit ? formatCurrency(row.credit) : ""}
                  </div>
                  <div className="text-right font-mono">
                    {formatCurrency(row.runningBalance)}
                  </div>
                </div>
              ))}
            </div>

            {/* Closing balance */}
            <div className="grid min-w-[820px] grid-cols-[110px_140px_1fr_130px_130px_150px] gap-4 border-t bg-muted/40 px-6 py-3 text-sm">
              <div className="col-span-3 font-semibold">
                {t("closingBalance")}
              </div>
              <div />
              <div />
              <div
                className={cn(
                  "text-right font-mono font-semibold",
                  Number(statement.closingBalance) < 0 && "text-destructive",
                )}
              >
                {formatCurrency(statement.closingBalance)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
