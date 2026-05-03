import Link from "next/link";
import {
  Landmark,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  Coins,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  getTrialBalance,
  listBankAccounts,
  getFinancialSummary,
  listDocuments,
  calculateTrialBalanceTotals,
} from "@kivvi/core";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import { getTranslations } from "next-intl/server";
import { StatCard, MiniStat } from "@/components/money/stat-cards";

export async function OverviewTab({ companyId }: { companyId: string }) {
  const t = await getTranslations("moneyHub");
  const ta = await getTranslations("accounting");

  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const next30 = new Date(now);
  next30.setDate(next30.getDate() + 30);

  const [bankAccounts, financialSummary, trialBalance, dueThisWeek, dueNext30] =
    await Promise.all([
      listBankAccounts(db, companyId),
      getFinancialSummary(db, companyId),
      getTrialBalance(db, companyId),
      listDocuments(db, companyId, {
        status: "sent" as const,
        type: "invoice" as const,
        dateTo: nextWeek.toISOString().split("T")[0],
        page: 1,
        pageSize: 100,
      }),
      listDocuments(db, companyId, {
        status: "confirmed" as const,
        type: "purchase_invoice" as const,
        dateTo: next30.toISOString().split("T")[0],
        page: 1,
        pageSize: 100,
      }),
    ]);

  const totalBankBalance = bankAccounts.reduce(
    (sum, a) => sum + Number(a.balance || 0),
    0,
  );

  const totals = calculateTrialBalanceTotals(trialBalance);

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("cashPosition")}
          value={formatCurrency(totalBankBalance)}
          icon={<Landmark className="h-5 w-5" />}
          color="text-info"
          bgColor="bg-info/10"
          href="/money?tab=banking"
        />
        <StatCard
          label={t("receivables")}
          value={formatCurrency(financialSummary.outstandingTotal)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-success"
          bgColor="bg-success/10"
          href="/sales/invoices?status=sent"
        />
        <StatCard
          label={t("payables")}
          value={formatCurrency(financialSummary.draftsTotal)}
          icon={<TrendingDown className="h-5 w-5" />}
          color="text-warning"
          bgColor="bg-warning/10"
          href="/purchasing/purchase-invoices"
        />
        {financialSummary.overdueTotal > 0 && (
          <StatCard
            label={t("overdue")}
            value={formatCurrency(financialSummary.overdueTotal)}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="text-destructive"
            bgColor="bg-destructive/10"
            href="/sales/invoices?status=overdue"
            count={financialSummary.overdueCount}
          />
        )}
      </div>

      {/* Cash flow forecast */}
      {(financialSummary.outstandingTotal > 0 ||
        financialSummary.overdueTotal > 0) && (
        <div className="rounded-xl border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">{t("cashFlowForecast")}</h2>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <div className="rounded-lg bg-success/5 p-4">
              <p className="text-xs font-medium text-success">
                {t("expectedInflows")}
              </p>
              <p className="mt-1 text-lg font-bold text-success">
                {formatCurrency(financialSummary.outstandingTotal)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {dueThisWeek.total} {t("dueThisWeek")}
              </p>
            </div>
            <div className="rounded-lg bg-warning/5 p-4">
              <p className="text-xs font-medium text-warning">
                {t("expectedOutflows")}
              </p>
              <p className="mt-1 text-lg font-bold text-warning">
                {formatCurrency(
                  dueNext30.data.reduce(
                    (sum: number, d: { total: string }) =>
                      sum + Number(d.total || 0),
                    0,
                  ),
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {dueNext30.total} {t("vendorInvoices30d")}
              </p>
            </div>
            <div className="rounded-lg bg-info/5 p-4">
              <p className="text-xs font-medium text-info">
                {t("netPosition")}
              </p>
              <p className="mt-1 text-lg font-bold text-info">
                {formatCurrency(
                  totalBankBalance +
                    financialSummary.outstandingTotal -
                    dueNext30.data.reduce(
                      (sum: number, d: { total: string }) =>
                        sum + Number(d.total || 0),
                      0,
                    ),
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("bankPlusReceivablesMinusPayables")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bank accounts summary */}
      {bankAccounts.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">{t("bankAccounts")}</h2>
            <Link
              href="/money?tab=banking"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t("totalBalance")}: {formatCurrency(totalBankBalance)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {bankAccounts.map((account) => (
              <Link
                key={account.id}
                href={`/banking/${account.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="rounded-lg bg-primary/10 p-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{account.name}</p>
                  {account.bankName && (
                    <p className="text-xs text-muted-foreground">
                      {account.bankName}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold">
                  {formatCurrency(
                    account.balance || "0",
                    account.currency || DEFAULT_CURRENCY,
                  )}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trial balance snapshot */}
      {trialBalance.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">{t("trialBalance")}</h2>
            <Link
              href="/money?tab=accounting"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t("accounting")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
            <MiniStat
              label={ta("assets")}
              value={totals.assets}
              color="text-info"
              bgColor="bg-info/10"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <MiniStat
              label={ta("liabilities")}
              value={totals.liabilities}
              color="text-destructive"
              bgColor="bg-destructive/10"
              icon={<TrendingDown className="h-5 w-5" />}
            />
            <MiniStat
              label={ta("equity")}
              value={totals.equity}
              color="text-tag-purple"
              bgColor="bg-tag-purple/10"
              icon={<Scale className="h-5 w-5" />}
            />
            <MiniStat
              label={ta("revenue")}
              value={totals.revenue}
              color="text-success"
              bgColor="bg-success/10"
              icon={<Coins className="h-5 w-5" />}
            />
            <MiniStat
              label={ta("expenses")}
              value={totals.expenses}
              color="text-warning"
              bgColor="bg-warning/10"
              icon={<Receipt className="h-5 w-5" />}
            />
          </div>
        </div>
      )}
    </div>
  );
}
