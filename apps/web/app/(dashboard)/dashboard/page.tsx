import { Suspense } from "react";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import {
  ExecutiveSummary,
  PriorityActions,
  SmartStats,
  RecentActivity,
  AIAssistantPrompt,
  QuickActions,
  WelcomeSection,
} from "./sections";
import { InventoryOverview } from "./sections/inventory-overview";
import { ImpactOverview } from "./sections/impact-overview";
import { CmdKHint } from "./cmd-k-hint";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  ExecutiveSummarySkeleton,
  PriorityActionsSkeleton,
  StatsSkeleton,
  RecentActivitySkeleton,
  AIAssistantSkeleton,
  QuickActionsSkeleton,
} from "./skeletons";
import { db } from "@/lib/db";
import {
  companies,
  contacts,
  documents,
  inventoryItems,
  users,
  bankAccounts,
} from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq, count } from "drizzle-orm";
import { OnboardingChecklist } from "./sections/onboarding-checklist";
import { SampleDataBanner } from "./sections/sample-data-banner";

// Cache dashboard for 60 seconds
export const revalidate = 60;

export default async function DashboardPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("dashboard");

  // Fetch company info and counts for welcome section + sinceDate filter
  const companyId = session.user.companyId;
  const [
    company,
    contactCountResult,
    documentCountResult,
    inventoryCountResult,
    userCountResult,
    bankAccountResult,
  ] = await Promise.all([
    db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: { createdAt: true, name: true, settings: true, slug: true },
    }),
    db
      .select({ value: count() })
      .from(contacts)
      .where(eq(contacts.companyId, companyId)),
    db
      .select({ value: count() })
      .from(documents)
      .where(eq(documents.companyId, companyId)),
    db
      .select({ value: count() })
      .from(inventoryItems)
      .where(eq(inventoryItems.companyId, companyId)),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.companyId, companyId)),
    db
      .select({ iban: bankAccounts.iban })
      .from(bankAccounts)
      .where(eq(bankAccounts.companyId, companyId))
      .limit(1),
  ]);
  const sinceDate = company?.createdAt;
  const companyName = company?.name ?? "";
  const contactCount = contactCountResult[0]?.value ?? 0;
  const documentCount = documentCountResult[0]?.value ?? 0;

  // Checklist data
  const companyAgeDays = company?.createdAt
    ? Math.floor((Date.now() - company.createdAt.getTime()) / 86_400_000)
    : 999;
  const settings = (company?.settings as CompanySettings) ?? {};
  const checklistState = {
    hasIntake: (inventoryCountResult[0]?.value ?? 0) > 0,
    hasInvoice: documentCount > 0,
    hasBankAccount: !!(
      bankAccountResult[0]?.iban || settings.bankAccount?.iban
    ),
    hasTeamMember: (userCountResult[0]?.value ?? 0) > 1,
    hasShopUrl: !!company?.slug,
    companyAgeDays,
  };

  return (
    <div className="space-y-8">
      {/* Sample data mode banner */}
      {settings.isSampleData && <SampleDataBanner />}

      {/* Welcome guide for brand new companies */}
      <WelcomeSection
        companyName={companyName}
        contactCount={contactCount}
        documentCount={documentCount}
      />

      {/* Post-onboarding guided checklist (first 7 days) */}
      <OnboardingChecklist {...checklistState} />

      {/* Feature hint: Cmd+K */}
      <CmdKHint />

      {/* Section 1: "Good morning. Here's what matters." */}
      <ErrorBoundary>
        <Suspense fallback={<ExecutiveSummarySkeleton />}>
          <ExecutiveSummary sinceDate={sinceDate} />
        </Suspense>
      </ErrorBoundary>

      {/* 3 key stat cards — revenue, outstanding, bank balance */}
      <ErrorBoundary>
        <Suspense fallback={<StatsSkeleton />}>
          <SmartStats sinceDate={sinceDate} />
        </Suspense>
      </ErrorBoundary>

      {/* Inventory business metrics (only shows if items exist) */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <InventoryOverview />
        </Suspense>
      </ErrorBoundary>

      {/* Impact metrics (only shows if items exist) */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <ImpactOverview />
        </Suspense>
      </ErrorBoundary>

      {/* Quick actions — create invoice, quote, contact etc. */}
      <ErrorBoundary>
        <Suspense fallback={<QuickActionsSkeleton />}>
          <QuickActions />
        </Suspense>
      </ErrorBoundary>

      {/* Section 2: "Your attention is needed" */}
      <ErrorBoundary>
        <Suspense fallback={<PriorityActionsSkeleton />}>
          <PriorityActions sinceDate={sinceDate} />
        </Suspense>
      </ErrorBoundary>

      {/* Section 3: Quick access — Recent Activity + AI Assistant */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ErrorBoundary>
          <Suspense fallback={<RecentActivitySkeleton />}>
            <RecentActivity />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<AIAssistantSkeleton />}>
            <AIAssistantPrompt />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
