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
import { companies, contacts, documents } from "@kivvi/database";
import { eq, count } from "drizzle-orm";

// Cache dashboard for 60 seconds
export const revalidate = 60;

export default async function DashboardPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("dashboard");

  // Fetch company info and counts for welcome section + sinceDate filter
  const companyId = session.user.companyId;
  const [company, contactCountResult, documentCountResult] = await Promise.all([
    db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: { createdAt: true, name: true },
    }),
    db
      .select({ value: count() })
      .from(contacts)
      .where(eq(contacts.companyId, companyId)),
    db
      .select({ value: count() })
      .from(documents)
      .where(eq(documents.companyId, companyId)),
  ]);
  const sinceDate = company?.createdAt;
  const companyName = company?.name ?? "";
  const contactCount = contactCountResult[0]?.value ?? 0;
  const documentCount = documentCountResult[0]?.value ?? 0;

  return (
    <div className="space-y-8">
      {/* Welcome guide for brand new companies */}
      <WelcomeSection
        companyName={companyName}
        contactCount={contactCount}
        documentCount={documentCount}
      />

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
