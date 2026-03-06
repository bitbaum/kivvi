import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Landmark, Plus, CreditCard } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listBankAccounts } from '@kivvi/core';
import { bankTransactions, bankAccounts } from '@kivvi/database';
import { eq, and, sql, max } from 'drizzle-orm';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AddAccountForm } from './add-account-form';
import { PageHeader } from '@/components/page-header';
import { getTranslations } from 'next-intl/server';

export default async function BankingPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('banking');
  const companyId = session.user.companyId;

  const [accounts, [txSummary]] = await Promise.all([
    listBankAccounts(db, companyId),
    db.select({
      unreconciledCount: sql<number>`count(*) filter (where ${bankTransactions.isReconciled} = false)::int`,
      lastTransactionDate: max(bankTransactions.date),
    })
      .from(bankTransactions)
      .innerJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
      .where(eq(bankAccounts.companyId, companyId)),
  ]);

  const totalBalance = accounts.reduce(
    (sum, a) => sum + Number(a.balance || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<AddAccountForm />}
      />

      {/* Summary */}
      {accounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-muted px-3 py-1 font-medium">
            {t('summaryAccounts', { count: accounts.length })}
          </span>
          <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 font-medium text-blue-700 dark:text-blue-300">
            {t('summaryBalance', { amount: formatCurrency(totalBalance) })}
          </span>
          {txSummary.unreconciledCount > 0 && (
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 font-medium text-amber-700 dark:text-amber-300">
              {t('summaryUnreconciled', { count: txSummary.unreconciledCount })}
            </span>
          )}
          {txSummary.lastTransactionDate && (
            <span className="rounded-full bg-muted px-3 py-1 font-medium">
              {t('summaryLastTransaction', { date: formatDate(txSummary.lastTransactionDate) })}
            </span>
          )}
        </div>
      )}

      {/* Bank Account Cards */}
      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={t('noBankAccounts')}
          description={t('addFirstAccount')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Link
              key={account.id}
              href={`/banking/${account.id}`}
              className="group rounded-xl border bg-card p-6 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {account.name}
                    </h3>
                    {account.bankName && (
                      <p className="text-xs text-muted-foreground">{account.bankName}</p>
                    )}
                  </div>
                </div>
              </div>

              {account.iban && (
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  {account.iban}
                </p>
              )}

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('balance')}</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(account.balance || '0', account.currency || 'CHF')}
                  </p>
                </div>
                {account.lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    {t('lastSync')}: {formatDate(account.lastSyncAt)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
