import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, RepeatIcon } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listRecurringConfigs } from '@kivvi/core';
import { getTranslations } from 'next-intl/server';
import { RecurringConfigRow } from './recurring-config-row';

export default async function RecurringInvoicesPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('settings');
  const tc = await getTranslations('common');

  const configs = await listRecurringConfigs(db, session.user.companyId);

  const PERIODICITY_LABELS: Record<string, string> = {
    monthly: t('recurring.periodicity.monthly'),
    quarterly: t('recurring.periodicity.quarterly'),
    annual: t('recurring.periodicity.annual'),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc('back')}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('recurring.title')}</h1>
          <p className="text-muted-foreground">
            {t('recurring.subtitle')}
          </p>
        </div>
        <Link
          href="/settings/recurring-invoices/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('recurring.createNew')}
        </Link>
      </div>

      {/* Configs list */}
      <div className="rounded-xl border bg-card">
        {configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RepeatIcon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{tc('noResults')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('recurring.noConfigs')}
            </p>
            <Link
              href="/settings/recurring-invoices/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('recurring.createFirst')}
            </Link>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div>{t('recurring.baseOrder')}</div>
              <div>{t('recurring.customer')}</div>
              <div>{t('recurring.periodicity.label')}</div>
              <div>{t('recurring.nextGeneration')}</div>
              <div>{t('recurring.status')}</div>
              <div></div>
            </div>

            {/* Table rows */}
            <div className="divide-y">
              {configs.map((config) => (
                <RecurringConfigRow
                  key={config.id}
                  config={config}
                  periodicityLabel={PERIODICITY_LABELS[config.periodicity] || config.periodicity}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
