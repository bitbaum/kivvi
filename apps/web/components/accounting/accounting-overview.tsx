import Link from "next/link";
import {
  BookOpen,
  FileSpreadsheet,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  Coins,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getTrialBalance, calculateTrialBalanceTotals } from "@kivvi/core";
import { MiniStat, NavCard } from "@/components/money/stat-cards";

/**
 * The accounting overview, defined once and rendered in two places:
 * the /accounting page and the Accounting tab on /money.
 */

/** Links into the three accounting sub-sections. */
export async function AccountingNavCards() {
  const t = await getTranslations("accounting");

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <NavCard
        href="/accounting/chart-of-accounts"
        icon={<BookOpen className="h-6 w-6" />}
        title={t("chartOfAccounts")}
        description={t("manageChartOfAccounts")}
      />
      <NavCard
        href="/accounting/journal"
        icon={<FileSpreadsheet className="h-6 w-6" />}
        title={t("journal")}
        description={t("viewJournalEntries")}
      />
      <NavCard
        href="/accounting/fiscal-years"
        icon={<Calendar className="h-6 w-6" />}
        title={t("fiscalYears")}
        description={t("manageFiscalYears")}
      />
    </div>
  );
}

/**
 * Trial-balance summary card.
 *
 * `showWhenEmpty` decides what a company with no accounts sees: the
 * /accounting page shows an empty state pointing at the chart of accounts,
 * the /money tab shows nothing at all (that page has other content).
 */
export async function TrialBalancePanel({
  companyId,
  showWhenEmpty = false,
}: {
  companyId: string;
  showWhenEmpty?: boolean;
}) {
  const t = await getTranslations("accounting");
  const tc = await getTranslations("common");

  const trialBalance = await getTrialBalance(db, companyId);
  const totals = calculateTrialBalanceTotals(trialBalance);
  const hasData = trialBalance.length > 0;

  if (!hasData && !showWhenEmpty) return null;

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold">{t("trialBalance")}</h2>
        {hasData && (
          <Link
            href="/accounting/chart-of-accounts"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {tc("viewDetails")} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {!hasData ? (
        <div className="p-12 text-center text-muted-foreground">
          <Scale className="mx-auto mb-3 h-10 w-10" />
          <p className="text-lg font-medium">{t("noAccounts")}</p>
          <p className="mt-1 text-sm">{t("manageChartOfAccounts")}</p>
          <Link
            href="/accounting/chart-of-accounts"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <BookOpen className="h-4 w-4" />
            {t("chartOfAccounts")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
          <MiniStat
            label={t("assets")}
            value={totals.assets}
            icon={<TrendingUp className="h-5 w-5" />}
            color="text-info"
            bgColor="bg-info/10"
          />
          <MiniStat
            label={t("liabilities")}
            value={totals.liabilities}
            icon={<TrendingDown className="h-5 w-5" />}
            color="text-destructive"
            bgColor="bg-destructive/10"
          />
          <MiniStat
            label={t("equity")}
            value={totals.equity}
            icon={<Scale className="h-5 w-5" />}
            color="text-tag-purple"
            bgColor="bg-tag-purple/10"
          />
          <MiniStat
            label={t("revenue")}
            value={totals.revenue}
            icon={<Coins className="h-5 w-5" />}
            color="text-success"
            bgColor="bg-success/10"
          />
          <MiniStat
            label={t("expenses")}
            value={totals.expenses}
            icon={<Receipt className="h-5 w-5" />}
            color="text-warning"
            bgColor="bg-warning/10"
          />
        </div>
      )}
    </div>
  );
}
