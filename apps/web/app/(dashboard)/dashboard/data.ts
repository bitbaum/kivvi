import { db } from '@/lib/db';
import {
  getDashboardAlerts,
  getDashboardStats,
  getWorkflowSuggestions,
  getRecentActivity,
} from '@kivvi/core/src/domain/dashboard';
import { getSalesReport, getAgingReport } from '@kivvi/core/src/domain/reports';
import { AGING_BUCKET_COLORS } from '@/lib/config/chart-colors';
import { cache } from 'react';

/**
 * Fetch all dashboard data in parallel
 * Cached with React cache() for deduplication
 */
export const fetchDashboardData = cache(async (companyId: string) => {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Fetch everything in parallel to avoid waterfall pattern
  const [alerts, stats, suggestions, activity, salesReport, agingReport] =
    await Promise.all([
      getDashboardAlerts(db, companyId),
      getDashboardStats(db, companyId),
      getWorkflowSuggestions(db, companyId),
      getRecentActivity(db, companyId, 15),
      getSalesReport(
        db,
        companyId,
        sixMonthsAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      ),
      getAgingReport(db, companyId, now.toISOString().split('T')[0]),
    ]);

  return {
    alerts,
    stats,
    suggestions,
    activity,
    revenueData: salesReport.rows.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
    })),
    agingData: [
      { name: 'current', value: Number(agingReport.totals.current), color: AGING_BUCKET_COLORS.current },
      { name: 'days30', value: Number(agingReport.totals.days30), color: AGING_BUCKET_COLORS.days30 },
      { name: 'days60', value: Number(agingReport.totals.days60), color: AGING_BUCKET_COLORS.days60 },
      { name: 'days90', value: Number(agingReport.totals.days90), color: AGING_BUCKET_COLORS.days90 },
      { name: 'over90', value: Number(agingReport.totals.over90), color: AGING_BUCKET_COLORS.over90 },
    ].filter((d) => d.value > 0),
  };
});
