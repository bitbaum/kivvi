import { AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { detectOverdueInvoices, getDunningStats } from '@kivvi/core';
import { formatCurrency } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { SelectableDunningTable } from '@/components/dunning/selectable-dunning-table';

export default async function DunningPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const td = await getTranslations('dunning');
  const t = await getTranslations('documents');
  const tc = await getTranslations('common');
  const ts = await getTranslations('status');
  const tb = await getTranslations('bulkActions');

  const [overdueInvoices, stats] = await Promise.all([
    detectOverdueInvoices(db, session.user.companyId),
    getDunningStats(db, session.user.companyId),
  ]);

  // Pre-resolve translations for client component
  const allStatuses = ['draft', 'sent', 'confirmed', 'delivered', 'paid', 'partiallyPaid', 'overdue', 'cancelled', 'dunning1', 'dunning2', 'dunning3'];
  const statusLabels: Record<string, string> = {};
  for (const s of allStatuses) {
    statusLabels[s] = ts(s);
  }

  const bulkActionKeys = [
    'selected', 'clearSelection', 'sendDunning',
    'processing', 'successAll', 'successPartial', 'failedAll',
    'showErrors', 'hideErrors',
  ];
  const bulkLabels: Record<string, string> = {};
  for (const key of bulkActionKeys) {
    bulkLabels[key] = tb(key);
  }

  const columnLabels = {
    invoice: t('invoice'),
    customer: t('customer'),
    amount: tc('amount'),
    daysOverdue: td('daysOverdue'),
    level: td('level'),
    action: td('action'),
    noCustomer: t('noCustomer'),
    maxLevel: td('maxLevel'),
  };

  const dunningButtonLabels: Record<number, string> = {
    0: td('sendReminder'),
    1: td('send2ndReminder'),
    2: td('sendFinalNotice'),
  };

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
          <SelectableDunningTable
            data={overdueInvoices.map((inv) => ({
              id: inv.id,
              number: inv.number,
              contactName: inv.contactName,
              total: inv.total,
              daysOverdue: inv.daysOverdue,
              dunningLevel: inv.dunningLevel,
              status: inv.status,
            }))}
            translations={{ columnLabels, statusLabels, dunningButtonLabels, bulkLabels }}
          />
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
