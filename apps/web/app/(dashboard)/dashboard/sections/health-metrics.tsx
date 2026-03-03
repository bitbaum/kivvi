import { getBusinessHealthMetrics } from '@kivvi/core/src/domain/dashboard';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { formatCurrency } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  TrendingUp,
  Target,
  Wallet,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';

export async function HealthMetrics() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const companyId = session.user.companyId;
  const t = await getTranslations('dashboard.healthMetrics');

  let metrics;
  try {
    metrics = await getBusinessHealthMetrics(db, companyId);
  } catch (error) {
    logger.error('HealthMetrics: failed to load metrics', error);
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {t('subtitle')}
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      label: t('profitMargin'),
      value: `${metrics.profitMargin}%`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      trend:
        metrics.profitMargin >= 20
          ? 'excellent'
          : metrics.profitMargin >= 10
            ? 'good'
            : 'poor',
    },
    {
      label: t('conversionRate'),
      value: `${metrics.conversionRate}%`,
      icon: <Target className="h-5 w-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      trend:
        metrics.conversionRate >= 30
          ? 'excellent'
          : metrics.conversionRate >= 15
            ? 'good'
            : 'poor',
    },
    {
      label: t('avgInvoice'),
      value: formatCurrency(metrics.avgInvoiceValue),
      icon: <Wallet className="h-5 w-5" />,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      trend: 'neutral',
    },
    {
      label: t('daysToPayment'),
      value: `${metrics.avgDaysToPayment}d`,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      trend:
        metrics.avgDaysToPayment <= 15
          ? 'excellent'
          : metrics.avgDaysToPayment <= 30
            ? 'good'
            : 'poor',
    },
    {
      label: t('cashFlowRatio'),
      value: `${metrics.cashFlowRatio}%`,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
      trend:
        metrics.cashFlowRatio >= 120
          ? 'excellent'
          : metrics.cashFlowRatio >= 100
            ? 'good'
            : 'poor',
    },
    {
      label: t('customerRetention'),
      value: `${metrics.customerRetentionRate}%`,
      icon: <Users className="h-5 w-5" />,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      trend:
        metrics.customerRetentionRate >= 80
          ? 'excellent'
          : metrics.customerRetentionRate >= 60
            ? 'good'
            : 'poor',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className="group rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${metric.bgColor}`}
              >
                <div className={metric.color}>{metric.icon}</div>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold">{metric.value}</p>
              {metric.trend !== 'neutral' && (
                <p
                  className={`mt-1 text-xs ${
                    metric.trend === 'excellent'
                      ? 'text-green-600 dark:text-green-400'
                      : metric.trend === 'good'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {metric.trend === 'excellent'
                    ? t('trendExcellent')
                    : metric.trend === 'good'
                      ? t('trendGood')
                      : t('trendNeedsAttention')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
