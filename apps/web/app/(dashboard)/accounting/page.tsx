import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { AccountingNavCards, TrialBalancePanel } from "@/components/accounting/accounting-overview";

export default async function AccountingPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("accounting");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Navigation cards */}
      <AccountingNavCards />

      {/* Trial Balance Summary */}
      <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
        <TrialBalancePanel companyId={session.user.companyId} showWhenEmpty />
      </Suspense>
    </div>
  );
}
