import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { RevenueChart, AgingChart } from './charts';
import {
  QuickActions,
  AlertsSection,
  WorkflowSuggestions,
  SmartStats,
  RecentActivity,
  AIAssistantPrompt,
  HealthMetrics,
} from './sections';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  QuickActionsSkeleton,
  AlertsSkeleton,
  WorkflowSuggestionsSkeleton,
  StatsSkeleton,
  ChartsSkeleton,
  RecentActivitySkeleton,
  AIAssistantSkeleton,
  HealthMetricsSkeleton,
} from './skeletons';
import { AGING_BUCKET_COLORS } from '@/lib/config/chart-colors';

// Cache dashboard for 60 seconds
export const revalidate = 60;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('dashboard');

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('greeting.morning')
      : hour < 18
        ? t('greeting.afternoon')
        : t('greeting.evening');

  return (
    <div className="space-y-8">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t('skipToMain')}
      </a>

      {/* Header */}
      <div id="main-content">
        <h1 className="text-3xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground">{t('hereIsOverview')}</p>
      </div>

      {/* Quick Actions - Prominent at top */}
      <ErrorBoundary>
        <Suspense fallback={<QuickActionsSkeleton />}>
          <QuickActions />
        </Suspense>
      </ErrorBoundary>

      {/* Alerts - Action-oriented notifications */}
      <ErrorBoundary>
        <Suspense fallback={<AlertsSkeleton />}>
          <AlertsSection />
        </Suspense>
      </ErrorBoundary>

      {/* Workflow Suggestions - AI-powered next steps */}
      <ErrorBoundary>
        <Suspense fallback={<WorkflowSuggestionsSkeleton />}>
          <WorkflowSuggestions />
        </Suspense>
      </ErrorBoundary>

      {/* Smart Stats - Clickable stat cards */}
      <ErrorBoundary>
        <Suspense fallback={<StatsSkeleton />}>
          <SmartStats />
        </Suspense>
      </ErrorBoundary>

      {/* Business Health Metrics */}
      <ErrorBoundary>
        <Suspense fallback={<HealthMetricsSkeleton />}>
          <HealthMetrics />
        </Suspense>
      </ErrorBoundary>

      {/* Charts */}
      <ErrorBoundary>
        <Suspense fallback={<ChartsSkeleton />}>
          <DashboardCharts />
        </Suspense>
      </ErrorBoundary>

      {/* Recent Activity - Unified activity feed */}
      <ErrorBoundary>
        <Suspense fallback={<RecentActivitySkeleton />}>
          <RecentActivity />
        </Suspense>
      </ErrorBoundary>

      {/* AI Assistant - Prominent AI chat entry */}
      <ErrorBoundary>
        <Suspense fallback={<AIAssistantSkeleton />}>
          <AIAssistantPrompt />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

// Separate component for charts to enable independent loading
async function DashboardCharts() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const companyId = session.user.companyId;
  const t = await getTranslations('dashboard');

  // Import here to avoid pulling into main bundle
  const { db } = await import('@/lib/db');
  const { getSalesReport, getAgingReport } = await import(
    '@kivvi/core/src/domain/reports'
  );

  // Chart data: last 6 months of revenue
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const salesReport = await getSalesReport(
    db,
    companyId,
    sixMonthsAgo.toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );
  const revenueData = salesReport.rows.map((r) => ({
    month: r.month,
    revenue: r.revenue,
  }));

  // Chart data: aging analysis
  const agingReport = await getAgingReport(
    db,
    companyId,
    new Date().toISOString().split('T')[0]
  );
  const agingData = [
    { name: t('aging.current'), value: agingReport.totals.current, color: AGING_BUCKET_COLORS.current },
    { name: t('aging.days30'), value: agingReport.totals.days30, color: AGING_BUCKET_COLORS.days30 },
    { name: t('aging.days60'), value: agingReport.totals.days60, color: AGING_BUCKET_COLORS.days60 },
    { name: t('aging.days90'), value: agingReport.totals.days90, color: AGING_BUCKET_COLORS.days90 },
    { name: t('aging.over90'), value: agingReport.totals.over90, color: AGING_BUCKET_COLORS.over90 },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('charts.revenue')}</h3>
        {revenueData.length > 0 ? (
          <RevenueChart data={revenueData} />
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            {t('charts.noRevenue')}
          </p>
        )}
      </div>
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('charts.aging')}</h3>
        {agingData.length > 0 ? (
          <AgingChart data={agingData} />
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            {t('charts.noInvoices')}
          </p>
        )}
      </div>
    </div>
  );
}
