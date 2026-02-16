import { getDashboardStats } from '@kivvi/core/src/domain/dashboard';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
  Wallet,
  Users,
  Package,
  AlertCircle,
  Calendar,
} from 'lucide-react';

export async function SmartStats() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const companyId = session.user.companyId;
  const stats = await getDashboardStats(db, companyId);

  const t = await getTranslations('dashboard.stats');

  const statCards = [
    {
      ...stats.revenueThisMonth,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      alert: false,
    },
    {
      ...stats.revenueThisYear,
      icon: <Calendar className="h-5 w-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      alert: false,
    },
    {
      ...stats.outstandingInvoices,
      icon: <FileText className="h-5 w-5" />,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      alert: false,
    },
    {
      ...stats.overdueInvoices,
      icon: <AlertCircle className="h-5 w-5" />,
      color: stats.overdueInvoices.count && stats.overdueInvoices.count > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
      bgColor: stats.overdueInvoices.count && stats.overdueInvoices.count > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted',
      alert: stats.overdueInvoices.count !== undefined && stats.overdueInvoices.count > 0,
    },
    {
      ...stats.draftDocuments,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-900/30',
      alert: false,
    },
    {
      ...stats.bankBalance,
      icon: <Wallet className="h-5 w-5" />,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      alert: false,
    },
    {
      ...stats.activeContacts,
      icon: <Users className="h-5 w-5" />,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      alert: false,
    },
    {
      ...stats.activeProducts,
      icon: <Package className="h-5 w-5" />,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
      alert: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            href={stat.linkTo}
            className={`group rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              stat.alert ? 'border-red-200 dark:border-red-900' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bgColor}`}
              >
                <div className={stat.color}>{stat.icon}</div>
              </div>
            </div>
            <div className="mt-2">
              <p
                className={`text-2xl font-bold ${
                  stat.alert ? 'text-red-600 dark:text-red-400' : ''
                }`}
              >
                {stat.type === 'currency'
                  ? formatCurrency(stat.value)
                  : stat.value}
              </p>
              {stat.count !== undefined && stat.count > 0 && (
                <p className="text-sm text-muted-foreground">
                  {stat.count} {stat.count === 1 ? t('document') : t('documents')}
                </p>
              )}
              {stat.changePercent !== undefined && (
                <div className="mt-1 flex items-center gap-1 text-sm">
                  {stat.changePercent > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">
                        +{stat.changePercent.toFixed(1)}%
                      </span>
                    </>
                  ) : stat.changePercent < 0 ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">
                        {stat.changePercent.toFixed(1)}%
                      </span>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
