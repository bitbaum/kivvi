import Link from "next/link";
import {
  BookOpen,
  FileSpreadsheet,
  Calendar,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  Coins,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { getTrialBalance, calculateTrialBalanceTotals } from "@kivvi/core";
import { getTranslations } from "next-intl/server";
import { MiniStat, NavCard } from "@/components/money/stat-cards";

export async function AccountingTab({ companyId }: { companyId: string }) {
  const t = await getTranslations("accounting");
  const tc = await getTranslations("common");
  const trialBalance = await getTrialBalance(db, companyId);

  const totals = calculateTrialBalanceTotals(trialBalance);
  const hasData = trialBalance.length > 0;

  return (
    <div className="space-y-6">
      {/* Navigation cards */}
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

      {/* Trial Balance Summary */}
      {hasData && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">{t("trialBalance")}</h2>
            <Link
              href="/accounting/chart-of-accounts"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {tc("viewDetails")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
            <MiniStat
              label={t("assets")}
              value={totals.assets}
              color="text-info"
              bgColor="bg-info/10"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <MiniStat
              label={t("liabilities")}
              value={totals.liabilities}
              color="text-destructive"
              bgColor="bg-destructive/10"
              icon={<TrendingDown className="h-5 w-5" />}
            />
            <MiniStat
              label={t("equity")}
              value={totals.equity}
              color="text-tag-purple"
              bgColor="bg-tag-purple/10"
              icon={<Scale className="h-5 w-5" />}
            />
            <MiniStat
              label={t("revenue")}
              value={totals.revenue}
              color="text-success"
              bgColor="bg-success/10"
              icon={<Coins className="h-5 w-5" />}
            />
            <MiniStat
              label={t("expenses")}
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
