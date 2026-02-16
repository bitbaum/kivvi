import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Landmark, Plus, CreditCard } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listBankAccounts } from '@kivvi/core';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AddAccountForm } from './add-account-form';
import { getTranslations } from 'next-intl/server';

export default async function BankingPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('banking');

  const accounts = await listBankAccounts(db, session.user.companyId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <AddAccountForm />
      </div>

      {/* Bank Account Cards */}
      {accounts.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <div className="flex flex-col items-center justify-center py-16">
            <Landmark className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{t('noBankAccounts')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('addFirstAccount')}
            </p>
          </div>
        </div>
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
                    {account.balance
                      ? formatCurrency(Number(account.balance), account.currency || 'CHF')
                      : formatCurrency(0, account.currency || 'CHF')}
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
