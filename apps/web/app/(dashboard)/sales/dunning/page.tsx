import { AlertTriangle, Send } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { detectOverdueInvoices, getDunningStats } from '@kivvi/core';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/documents/status-badge';
import { DunningButton } from './dunning-button';
import { getTranslations } from 'next-intl/server';

export default async function DunningPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const td = await getTranslations('dunning');
  const t = await getTranslations('documents');
  const tc = await getTranslations('common');

  const [overdueInvoices, stats] = await Promise.all([
    detectOverdueInvoices(db, session.user.companyId),
    getDunningStats(db, session.user.companyId),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{td('title')}</h1>
        <p className="text-muted-foreground">
          {td('subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={td('totalOverdue')}
          value={formatCurrency(stats.totalOverdueAmount)}
          subtitle={`${stats.totalOverdue} ${t('invoicePlural').toLowerCase()}`}
          alert
        />
        <StatCard
          label={td('noReminder')}
          value={String(stats.level0Count)}
          subtitle={t('invoicePlural').toLowerCase()}
        />
        <StatCard
          label={td('dunningLevel1')}
          value={String(stats.level1Count)}
          subtitle={td('firstReminderSent')}
        />
        <StatCard
          label={td('dunningLevel2to3')}
          value={String(stats.level2Count + stats.level3Count)}
          subtitle={td('escalated')}
          alert={stats.level2Count + stats.level3Count > 0}
        />
      </div>

      {/* Overdue invoices table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">{td('overdueInvoices')}</h2>
        </div>

        {overdueInvoices.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10" />
            <p className="text-lg font-medium">{td('noOverdueInvoices')}</p>
            <p className="mt-1 text-sm">{td('allPaidOnTime')}</p>
          </div>
        ) : (
          <>
            <div className="hidden border-b px-4 py-3 text-sm font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_1.5fr_auto_auto_auto_auto]">
              <span>{t('invoice')}</span>
              <span>{t('customer')}</span>
              <span className="text-right">{tc('amount')}</span>
              <span className="px-4 text-center">{td('daysOverdue')}</span>
              <span className="px-4 text-center">{td('level')}</span>
              <span className="text-right">{td('action')}</span>
            </div>

            <div className="divide-y">
              {overdueInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[1fr_1.5fr_auto_auto_auto_auto] sm:items-center sm:gap-4"
                >
                  <div>
                    <Link
                      href={`/sales/invoices/${inv.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {inv.contactName || t('noCustomer')}
                  </div>
                  <div className="text-right font-medium">
                    {formatCurrency(Number(inv.total))}
                  </div>
                  <div className="px-4 text-center">
                    <span className={`text-sm font-medium ${
                      inv.daysOverdue > 60 ? 'text-red-600 dark:text-red-400' :
                      inv.daysOverdue > 30 ? 'text-orange-600 dark:text-orange-400' :
                      'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {inv.daysOverdue}d
                    </span>
                  </div>
                  <div className="px-4 text-center">
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="text-right">
                    {inv.dunningLevel < 3 ? (
                      <DunningButton
                        invoiceId={inv.id}
                        currentLevel={inv.dunningLevel}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">{td('maxLevel')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  alert,
}: {
  label: string;
  value: string;
  subtitle: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${alert ? 'text-red-600 dark:text-red-400' : ''}`}>
        {value}
      </p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
