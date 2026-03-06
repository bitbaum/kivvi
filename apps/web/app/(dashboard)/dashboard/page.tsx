import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  ExecutiveSummary,
  PriorityActions,
  SmartStats,
  RecentActivity,
  AIAssistantPrompt,
} from './sections';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  ExecutiveSummarySkeleton,
  PriorityActionsSkeleton,
  StatsSkeleton,
  RecentActivitySkeleton,
  AIAssistantSkeleton,
} from './skeletons';
import { db } from '@/lib/db';
import { companies } from '@kivvi/database';
import { eq } from 'drizzle-orm';

// Cache dashboard for 60 seconds
export const revalidate = 60;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('dashboard');

  // Fetch company createdAt as sinceDate to filter out old imported data
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, session.user.companyId),
    columns: { createdAt: true },
  });
  const sinceDate = company?.createdAt;

  return (
    <div className="space-y-8">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t('skipToMain')}
      </a>

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
