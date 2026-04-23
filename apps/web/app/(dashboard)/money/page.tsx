import { Suspense } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { OverviewTab } from "./overview-tab";
import { BankingTab } from "./banking-tab";
import { AccountingTab } from "./accounting-tab";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MoneyPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const params = await searchParams;
  const tab = params.tab || "overview";
  const t = await getTranslations("moneyHub");

  const tabs = [
    { id: "overview", label: t("overview") },
    { id: "banking", label: t("bankAccounts") },
    { id: "accounting", label: t("accounting") },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Tab navigation */}
      <div className="flex gap-2 border-b">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={item.id === "overview" ? "/money" : `/money?tab=${item.id}`}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === item.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <Suspense fallback={<MoneyTabSkeleton />}>
          <OverviewTab companyId={session.user.companyId} />
        </Suspense>
      )}
      {tab === "banking" && (
        <Suspense fallback={<MoneyTabSkeleton />}>
          <BankingTab companyId={session.user.companyId} />
        </Suspense>
      )}
      {tab === "accounting" && (
        <Suspense fallback={<MoneyTabSkeleton />}>
          <AccountingTab companyId={session.user.companyId} />
        </Suspense>
      )}
    </div>
  );
}

function MoneyTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
