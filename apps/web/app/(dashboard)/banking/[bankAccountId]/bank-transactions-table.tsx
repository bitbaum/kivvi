import Link from "next/link";
import { CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Pagination } from "@/components/pagination";
import { formatCurrency, formatDate, cn, paginationRange } from "@/lib/utils";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";
import type { DocumentType } from "@kivvi/database";
import { ReconcileButton } from "./reconcile-button";
import type { listTransactions } from "@kivvi/core";

type TransactionsResult = Awaited<ReturnType<typeof listTransactions>>;

interface BankTransactionsTableProps {
  transactions: TransactionsResult;
  currency: string;
  bankAccountId: string;
  filter?: string;
  search?: string;
}

export async function BankTransactionsTable({
  transactions,
  currency,
  bankAccountId,
  filter,
  search,
}: BankTransactionsTableProps) {
  const t = await getTranslations("banking");
  const tc = await getTranslations("common");

  function buildPageUrl(page: number): string {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    if (search) params.set("search", search);
    if (page > 1) params.set("page", page.toString());
    const qs = params.toString();
    return `/banking/${bankAccountId}${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
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
                    <div className="text-sm text-muted-foreground">{formatDate(txn.date)}</div>
                    <div className="text-sm">{txn.description || "-"}</div>
                    <div className="truncate text-sm font-mono text-muted-foreground">
                      {txn.reference || "-"}
                    </div>
                    <div
                      className={cn(
                        "text-right text-sm font-medium",
                        isPositive ? "text-success" : "text-destructive",
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(amount, currency)}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {txn.balance ? formatCurrency(txn.balance, currency) : "-"}
                    </div>
                    <div className="flex items-center justify-center">
                      {txn.isReconciled && txn.matchedDocument ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                            <AlertCircle className="h-3 w-3" />
                            {t("unreconciled")}
                          </span>
                          <ReconcileButton transactionId={txn.id} isReconciled={false} />
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
        buildHref={buildPageUrl}
        labels={{
          showing: tc(
            "showing",
            paginationRange(transactions.page, transactions.pageSize, transactions.total),
          ),
          previous: tc("previous"),
          next: tc("next"),
          pageOf: tc("pageOf", {
            page: transactions.page,
            totalPages: transactions.totalPages,
          }),
        }}
      />
    </>
  );
}
