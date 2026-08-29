import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import { db } from "@/lib/db";
import { getBankAccount, listTransactions, getReconciliationSummary } from "@kivvi/core";
import { formatCurrency, formatDate, cn, isValidUUID } from "@/lib/utils";
import { AutoMatchButton } from "./auto-match-button";
import { ImportTransactions } from "./import-transactions";
import { getTranslations } from "next-intl/server";
import { BankTransactionsTable } from "./bank-transactions-table";

interface PageProps {
  params: Promise<{ bankAccountId: string }>;
  searchParams: Promise<{
    filter?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function BankAccountDetailPage({ params, searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("banking");
  const tc = await getTranslations("common");

  const { bankAccountId } = await params;
  if (!isValidUUID(bankAccountId)) notFound();
  const sp = await searchParams;

  const account = await getBankAccount(db, session.user.companyId, bankAccountId);
  if (!account) notFound();

  const filter = sp.filter;
  const search = sp.search;
  const page = parseInt(sp.page || "1", 10);

  const isReconciled =
    filter === "reconciled" ? true : filter === "unreconciled" ? false : undefined;

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
              <p className="mt-1 font-mono text-sm text-muted-foreground">{account.iban}</p>
            )}
            {account.bankName && (
              <p className="text-sm text-muted-foreground">{account.bankName}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t("balance")}</p>
            <p className="text-2xl font-bold">
              {formatCurrency(account.balance || "0", account.currency || DEFAULT_CURRENCY)}
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
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          className="border-success/20"
        />
        <SummaryCard
          label={t("unreconciled")}
          value={summary.unreconciled.toString()}
          icon={<AlertCircle className="h-4 w-4 text-warning" />}
          className="border-warning/20"
        />
        <SummaryCard
          label={t("unreconciledAmount")}
          value={formatCurrency(
            summary.totalUnreconciledAmount,
            account.currency || DEFAULT_CURRENCY,
          )}
          icon={<CreditCard className="h-4 w-4 text-destructive" />}
          className="border-destructive/20"
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
            className="w-full rounded-lg border bg-background py-2 pl-3 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {filter && <input type="hidden" name="filter" value={filter} />}
        </form>

        <div className="flex gap-2">
          {(["all", "unreconciled", "reconciled"] as const).map((f) => {
            const isActive = f === "all" ? !filter : filter === f;
            const href = buildFilterUrl(bankAccountId, f === "all" ? undefined : f, search);
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

      <BankTransactionsTable
        transactions={transactions}
        currency={account.currency || DEFAULT_CURRENCY}
        bankAccountId={bankAccountId}
        filter={filter}
        search={search}
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

function buildFilterUrl(bankAccountId: string, filter?: string, search?: string): string {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (search) params.set("search", search);
  const qs = params.toString();
  return `/banking/${bankAccountId}${qs ? `?${qs}` : ""}`;
}
