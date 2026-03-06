import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  TrendingUp,
  Scale,
  Receipt,
  Clock,
  BarChart3,
  Heart,
  ArrowRight,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('reports');

  const REPORT_CARDS = [
    {
      href: '/reports/profit-loss',
      icon: TrendingUp,
      title: t('profitAndLoss'),
      description: t('profitAndLossDesc'),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      href: '/reports/balance-sheet',
      icon: Scale,
      title: t('balanceSheet'),
      description: t('balanceSheetDesc'),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      href: '/reports/vat',
      icon: Receipt,
      title: t('vatReport'),
      description: t('vatReportDesc'),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      href: '/reports/aging',
      icon: Clock,
      title: t('agingReport'),
      description: t('agingReportDesc'),
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      href: '/reports/sales',
      icon: BarChart3,
      title: t('salesReport'),
      description: t('salesReportDesc'),
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      href: '/reports/health',
      icon: Heart,
      title: t('healthMetrics'),
      description: t('healthMetricsDesc'),
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    },
  ] as const;

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* Report cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start gap-4">
              <div className={`rounded-lg p-3 ${card.bgColor} ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {card.description}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
