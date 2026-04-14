import { Suspense } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getTrialBalance } from "@kivvi/core";
import { formatCurrency } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function AccountingPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("accounting");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

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
      <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
        <TrialBalanceSummary companyId={session.user.companyId} />
      </Suspense>
    </div>
  );
}

async function TrialBalanceSummary({ companyId }: { companyId: string }) {
  const t = await getTranslations("accounting");
  const tc = await getTranslations("common");

  const trialBalance = await getTrialBalance(db, companyId);

  const totals = trialBalance.reduce(
    (acc, row) => {
      switch (row.type) {
        case "asset":
          acc.assets += row.balance;
          break;
        case "liability":
          acc.liabilities += Math.abs(row.balance);
          break;
        case "equity":
          acc.equity += Math.abs(row.balance);
          break;
        case "revenue":
          acc.revenue += row.totalCredit - row.totalDebit;
          break;
        case "expense":
          acc.expenses += row.totalDebit - row.totalCredit;
          break;
      }
      return acc;
    },
    { assets: 0, liabilities: 0, equity: 0, revenue: 0, expenses: 0 },
  );

  const hasData = trialBalance.length > 0;

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
          <SummaryCard
            label={t("assets")}
            value={totals.assets}
            icon={<TrendingUp className="h-5 w-5" />}
            color="text-info"
            bgColor="bg-info/10"
          />
          <SummaryCard
            label={t("liabilities")}
            value={totals.liabilities}
            icon={<TrendingDown className="h-5 w-5" />}
            color="text-destructive"
            bgColor="bg-destructive/10"
          />
          <SummaryCard
            label={t("equity")}
            value={totals.equity}
            icon={<Scale className="h-5 w-5" />}
            color="text-tag-purple"
            bgColor="bg-tag-purple/10"
          />
          <SummaryCard
            label={t("revenue")}
            value={totals.revenue}
            icon={<Coins className="h-5 w-5" />}
            color="text-success"
            bgColor="bg-success/10"
          />
          <SummaryCard
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

function NavCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-6 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2">
        <div className={`rounded-md p-1.5 ${bgColor} ${color}`}>{icon}</div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-bold ${color}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
