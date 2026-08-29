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
  RevampitIntegrationHealth,
  RevampitWorkflowHub,
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
import { getDashboardBootstrap } from "@kivvi/core/src/domain/dashboard-bootstrap";
import { OnboardingChecklist } from "./sections/onboarding-checklist";
import { SampleDataBanner } from "./sections/sample-data-banner";

// Cache dashboard for 60 seconds
export const revalidate = 60;

export default async function DashboardPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("dashboard");

  const companyId = session.user.companyId;
  const { company, contactCount, documentCount, checklistState } = await getDashboardBootstrap(
    db,
    companyId,
  );
  const sinceDate = company?.createdAt;
  const companyName = company?.name ?? "";
  const settings = company?.settings ?? {};

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

      {/* Revamp-it ERP companion workflow map */}
      <RevampitWorkflowHub />

      {/* Revamp-it ERP projection diagnostics */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <RevampitIntegrationHealth />
        </Suspense>
      </ErrorBoundary>

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
