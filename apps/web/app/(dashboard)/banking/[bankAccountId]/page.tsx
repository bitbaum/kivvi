import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Pagination } from "@/components/pagination";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import {
  getBankAccount,
  listTransactions,
  getReconciliationSummary,
} from "@kivvi/core";
import { formatCurrency, formatDate, cn, isValidUUID } from "@/lib/utils";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";
import type { DocumentType } from "@kivvi/database";
import { AutoMatchButton } from "./auto-match-button";
import { ImportTransactions } from "./import-transactions";
import { ReconcileButton } from "./reconcile-button";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ bankAccountId: string }>;
  searchParams: Promise<{
    filter?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function BankAccountDetailPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("banking");
  const tc = await getTranslations("common");

  const { bankAccountId } = await params;
  if (!isValidUUID(bankAccountId)) notFound();
  const sp = await searchParams;

  const account = await getBankAccount(
    db,
    session.user.companyId,
    bankAccountId,
  );
  if (!account) notFound();

  const filter = sp.filter;
  const search = sp.search;
  const page = parseInt(sp.page || "1", 10);

  const isReconciled =
    filter === "reconciled"
      ? true
      : filter === "unreconciled"
        ? false
        : undefined;

  const [transactions, summary] = await Promise.all([
    listTransactions(db, session.user.companyId, {
      bankAccountId,
      isReconciled,
      search,
      page,
      pageSize: 50,
    }),
    getReconciliationSummary(db, session.user.companyId, bankAccountId),
  ]);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/banking"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc("back")} {t("title")}
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{account.name}</h1>
              {account.currency && (
                <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  {account.currency}
                </span>
              )}
            </div>
            {account.iban && (
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {account.iban}
              </p>
            )}
            {account.bankName && (
              <p className="text-sm text-muted-foreground">
                {account.bankName}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t("balance")}</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                account.balance || "0",
                account.currency || "CHF",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Reconciliation Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <SummaryCard
          label={t("totalTransactions")}
          value={summary.totalTransactions.toString()}
          icon={<FileText className="h-4 w-4" />}
        />
        <SummaryCard
          label={t("reconciled")}
          value={summary.reconciled.toString()}
          icon={
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          }
          className="border-green-200 dark:border-green-900/50"
        />
        <SummaryCard
          label={t("unreconciled")}
          value={summary.unreconciled.toString()}
          icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
          className="border-amber-200 dark:border-amber-900/50"
        />
        <SummaryCard
          label={t("unreconciledAmount")}
          value={formatCurrency(
            summary.totalUnreconciledAmount,
            account.currency || "CHF",
          )}
          icon={
            <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
          }
          className="border-red-200 dark:border-red-900/50"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <AutoMatchButton bankAccountId={bankAccountId} />
        <ImportTransactions bankAccountId={bankAccountId} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="relative flex-1 min-w-[200px] max-w-md">
          <input
            name="search"
            type="text"
            placeholder={t("searchTransactions")}
            defaultValue={search}
            className="w-full rounded-lg border bg-background py-2 pl-3 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {filter && <input type="hidden" name="filter" value={filter} />}
        </form>

        <div className="flex gap-2">
          {(["all", "unreconciled", "reconciled"] as const).map((f) => {
            const isActive = f === "all" ? !filter : filter === f;
            const href = buildFilterUrl(
              bankAccountId,
              f === "all" ? undefined : f,
              search,
            );
            return (
              <Link
                key={f}
                href={href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors min-h-[44px] inline-flex items-center",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {f === "all"
                  ? tc("all")
                  : f === "unreconciled"
                    ? t("unreconciled")
                    : t("reconciled")}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border bg-card">
        {transactions.data.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10" />
            <p className="text-lg font-medium">{tc("noResults")}</p>
            <p className="mt-1 text-sm">
              {search || filter ? t("adjustFilters") : t("importToStart")}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden border-b px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[100px_1fr_150px_120px_120px_180px]">
              <span>{tc("date")}</span>
              <span>{tc("description")}</span>
              <span>{t("reference")}</span>
              <span className="text-right">{tc("amount")}</span>
              <span className="text-right">{t("balance")}</span>
              <span className="text-center">{tc("status")}</span>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {transactions.data.map((txn) => {
                const amount = Number(txn.amount);
                const isPositive = amount >= 0;

                return (
                  <div
                    key={txn.id}
                    className="flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[100px_1fr_150px_120px_120px_180px] sm:items-center sm:gap-4"
                  >
                    <div className="text-sm text-muted-foreground">
                      {formatDate(txn.date)}
                    </div>
                    <div className="text-sm">{txn.description || "-"}</div>
                    <div className="truncate text-sm font-mono text-muted-foreground">
                      {txn.reference || "-"}
                    </div>
                    <div
                      className={cn(
                        "text-right text-sm font-medium",
                        isPositive
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(amount, account.currency || "CHF")}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {txn.balance
                        ? formatCurrency(txn.balance, account.currency || "CHF")
                        : "-"}
                    </div>
                    <div className="flex items-center justify-center">
                      {txn.isReconciled && txn.matchedDocument ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            {t("reconciled")}
                          </span>
                          <Link
                            href={`${DOCUMENT_TYPES[txn.matchedDocument.type as DocumentType].basePath}/${txn.matchedDocument.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            {txn.matchedDocument.number}
                          </Link>
                          <ReconcileButton
                            transactionId={txn.id}
                            isReconciled={true}
                            matchedDocument={txn.matchedDocument}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            {t("unreconciled")}
                          </span>
                          <ReconcileButton
                            transactionId={txn.id}
                            isReconciled={false}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Pagination
        page={transactions.page}
        totalPages={transactions.totalPages}
        total={transactions.total}
        pageSize={transactions.pageSize}
        buildHref={(p) => buildPageUrl(bankAccountId, p, filter, search)}
        labels={{
          showing: tc("showing", {
            from: (transactions.page - 1) * transactions.pageSize + 1,
            to: Math.min(
              transactions.page * transactions.pageSize,
              transactions.total,
            ),
            total: transactions.total,
          }),
          previous: tc("previous"),
          next: tc("next"),
          pageOf: tc("pageOf", {
            page: transactions.page,
            totalPages: transactions.totalPages,
          }),
        }}
      />
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SummaryCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildFilterUrl(
  bankAccountId: string,
  filter?: string,
  search?: string,
): string {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (search) params.set("search", search);
  const qs = params.toString();
  return `/banking/${bankAccountId}${qs ? `?${qs}` : ""}`;
}

function buildPageUrl(
  bankAccountId: string,
  page: number,
  filter?: string,
  search?: string,
): string {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (search) params.set("search", search);
  if (page > 1) params.set("page", page.toString());
  const qs = params.toString();
  return `/banking/${bankAccountId}${qs ? `?${qs}` : ""}`;
}
