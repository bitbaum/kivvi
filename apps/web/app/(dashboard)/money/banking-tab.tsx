import Link from "next/link";
import { Landmark, CreditCard } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { db } from "@/lib/db";
import { listBankAccounts, getBankTransactionsSummary } from "@kivvi/core";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import { getTranslations } from "next-intl/server";
import { AddAccountForm } from "../banking/add-account-form";

export async function BankingTab({ companyId }: { companyId: string }) {
  const t = await getTranslations("banking");

  const [accounts, txSummary] = await Promise.all([
    listBankAccounts(db, companyId),
    getBankTransactionsSummary(db, companyId),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {accounts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-info/10 px-3 py-1 font-medium text-info">
              {t("summaryBalance", { amount: formatCurrency(totalBalance) })}
            </span>
            {txSummary.unreconciledCount > 0 && (
              <span className="rounded-full bg-warning/10 px-3 py-1 font-medium text-warning">
                {t("summaryUnreconciled", {
                  count: txSummary.unreconciledCount,
                })}
              </span>
            )}
          </div>
        ) : (
          <div />
        )}
        <AddAccountForm />
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={t("noBankAccounts")}
          description={t("addFirstAccount")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Link
              key={account.id}
              href={`/banking/${account.id}`}
              className="group rounded-xl border bg-card p-6 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {account.name}
                  </h3>
                  {account.bankName && (
                    <p className="text-xs text-muted-foreground">{account.bankName}</p>
                  )}
                </div>
              </div>
              {account.iban && (
                <p className="mt-3 font-mono text-xs text-muted-foreground">{account.iban}</p>
              )}
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t("balance")}</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(account.balance || "0", account.currency || DEFAULT_CURRENCY)}
                  </p>
                </div>
                {account.lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    {t("lastSync")}: {formatDate(account.lastSyncAt)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
