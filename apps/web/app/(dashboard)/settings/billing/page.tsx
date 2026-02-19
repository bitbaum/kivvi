import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { companies } from '@kivvi/database';
import type { CompanySettings } from '@kivvi/database';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { isPlanActive, isTrialing, getTrialDaysRemaining } from '@kivvi/core/src/domain/billing';
import { BillingActions } from './billing-actions';

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('settings.billing');

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  if (!company) redirect('/login');

  const settings = (company.settings as CompanySettings) || {};
  const active = isPlanActive(settings);
  const trialing = isTrialing(settings);
  const trialDays = getTrialDaysRemaining(settings);
  const plan = settings.plan ?? 'free';
  const status = settings.subscriptionStatus;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Current Plan */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">{t('currentPlan')}</h2>

        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold capitalize">{plan}</span>
          {active && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              {t('active')}
            </span>
          )}
          {status === 'past_due' && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
              {t('pastDue')}
            </span>
          )}
          {status === 'cancelled' && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
              {t('cancelled')}
            </span>
          )}
        </div>

        {trialing && (
          <p className="text-sm text-muted-foreground">
            {t('trialRemaining', { days: trialDays })}
          </p>
        )}

        {status === 'past_due' && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {t('pastDueMessage')}
          </p>
        )}
      </div>

      {/* Actions */}
      <BillingActions
        plan={plan}
        hasSubscription={!!settings.stripeSubscriptionId}
      />
    </div>
  );
}
