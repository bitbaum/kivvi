import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { RevenueChart, AgingChart } from './charts';
import {
  ExecutiveSummary,
  PriorityActions,
  SmartStats,
  RecentActivity,
  AIAssistantPrompt,
  HealthMetrics,
} from './sections';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  ExecutiveSummarySkeleton,
  PriorityActionsSkeleton,
  StatsSkeleton,
  ChartsSkeleton,
  RecentActivitySkeleton,
  AIAssistantSkeleton,
  HealthMetricsSkeleton,
} from './skeletons';
import { AGING_BUCKET_COLORS } from '@/lib/config/chart-colors';
import { formatCurrency } from '@/lib/utils';

// Cache dashboard for 60 seconds
export const revalidate = 60;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-8">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t('skipToMain')}
      </a>

      {/* 1. Executive Summary (greeting + business briefing) */}
      <ErrorBoundary>
        <Suspense fallback={<ExecutiveSummarySkeleton />}>
          <ExecutiveSummary />
        </Suspense>
      </ErrorBoundary>

      {/* 2. Priority Actions (merged alerts + workflow, max 6) */}
      <ErrorBoundary>
        <Suspense fallback={<PriorityActionsSkeleton />}>
          <PriorityActions />
        </Suspense>
      </ErrorBoundary>

      {/* 3. Key Metrics (4 stat cards — revenue, outstanding, overdue, bank balance) */}
      <ErrorBoundary>
        <Suspense fallback={<StatsSkeleton />}>
          <SmartStats />
        </Suspense>
      </ErrorBoundary>

      {/* 4. Charts with Narrative (revenue + aging, 2-col) */}
      <ErrorBoundary>
        <Suspense fallback={<ChartsSkeleton />}>
          <DashboardCharts />
        </Suspense>
      </ErrorBoundary>

      {/* 5. Business Health (6 KPI cards) */}
      <ErrorBoundary>
        <Suspense fallback={<HealthMetricsSkeleton />}>
          <HealthMetrics />
        </Suspense>
      </ErrorBoundary>

      {/* 6. Recent Activity + AI Assistant (2-col layout) */}
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

// Separate component for charts with narrative annotations
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
    revenue: Number(r.revenue),
  }));

  // Chart data: aging analysis
  const agingReport = await getAgingReport(
    db,
    companyId,
    new Date().toISOString().split('T')[0]
  );
  const agingData = [
    { name: t('aging.current'), value: Number(agingReport.totals.current), color: AGING_BUCKET_COLORS.current },
    { name: t('aging.days30'), value: Number(agingReport.totals.days30), color: AGING_BUCKET_COLORS.days30 },
    { name: t('aging.days60'), value: Number(agingReport.totals.days60), color: AGING_BUCKET_COLORS.days60 },
    { name: t('aging.days90'), value: Number(agingReport.totals.days90), color: AGING_BUCKET_COLORS.days90 },
    { name: t('aging.over90'), value: Number(agingReport.totals.over90), color: AGING_BUCKET_COLORS.over90 },
  ].filter((d) => d.value > 0);

  // Compute narrative data for revenue chart
  let revenueNarrative: string | null = null;
  if (revenueData.length > 0) {
    const peakMonth = revenueData.reduce((max, r) =>
      r.revenue > max.revenue ? r : max, revenueData[0]);
    const avgRevenue = revenueData.reduce((sum, r) => sum + r.revenue, 0) / revenueData.length;
    const currentMonth = revenueData[revenueData.length - 1];
    const trend = currentMonth.revenue >= avgRevenue ? 'above' : 'below';
    revenueNarrative = t(`charts.revenueNarrative.${trend}`, {
      peakMonth: peakMonth.month,
      peakAmount: formatCurrency(peakMonth.revenue),
      currentAmount: formatCurrency(currentMonth.revenue),
    });
  }

  // Compute narrative data for aging chart
  let agingNarrative: string | null = null;
  const agingTotal = Number(agingReport.totals.current) + Number(agingReport.totals.days30) +
    Number(agingReport.totals.days60) + Number(agingReport.totals.days90) + Number(agingReport.totals.over90);
  if (agingTotal > 0) {
    const currentPercent = Math.round((Number(agingReport.totals.current) / agingTotal) * 100);
    const overduePercent = Math.round(
      ((Number(agingReport.totals.days60) + Number(agingReport.totals.days90) + Number(agingReport.totals.over90)) / agingTotal) * 100
    );
    agingNarrative = t('charts.agingNarrative', {
      currentPercent,
      overduePercent,
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('charts.revenue')}</h3>
        {revenueData.length > 0 ? (
          <>
            <RevenueChart data={revenueData} />
            {revenueNarrative && (
              <p className="mt-3 text-sm text-muted-foreground">{revenueNarrative}</p>
            )}
          </>
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            {t('charts.noRevenue')}
          </p>
        )}
      </div>
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('charts.aging')}</h3>
        {agingData.length > 0 ? (
          <>
            <AgingChart data={agingData} />
            {agingNarrative && (
              <p className="mt-3 text-sm text-muted-foreground">{agingNarrative}</p>
            )}
          </>
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            {t('charts.noInvoices')}
          </p>
        )}
      </div>
    </div>
  );
}
