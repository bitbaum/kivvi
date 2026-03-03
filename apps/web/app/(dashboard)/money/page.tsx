import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Landmark,
  CreditCard,
  BookOpen,
  FileSpreadsheet,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  Coins,
  AlertTriangle,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTrialBalance, listBankAccounts, getFinancialSummary } from '@kivvi/core';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { AddAccountForm } from '../banking/add-account-form';
import { StatCard, MiniStat, NavCard } from '@/components/money/stat-cards';

interface TrialBalanceTotals {
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
}

function calculateTrialBalanceTotals(trialBalance: Array<{ type: string; balance: number; totalDebit: number; totalCredit: number }>): TrialBalanceTotals {
  return trialBalance.reduce(
    (acc, row) => {
      switch (row.type) {
        case 'asset': acc.assets += row.balance; break;
        case 'liability': acc.liabilities += Math.abs(row.balance); break;
        case 'equity': acc.equity += Math.abs(row.balance); break;
        case 'revenue': acc.revenue += row.totalCredit - row.totalDebit; break;
        case 'expense': acc.expenses += row.totalDebit - row.totalCredit; break;
      }
      return acc;
    },
    { assets: 0, liabilities: 0, equity: 0, revenue: 0, expenses: 0 }
  );
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MoneyPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const params = await searchParams;
  const tab = params.tab || 'overview';
  const t = await getTranslations('moneyHub');

  const tabs = [
    { id: 'overview', label: t('overview') },
    { id: 'banking', label: t('bankAccounts') },
    { id: 'accounting', label: t('accounting') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 border-b">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={item.id === 'overview' ? '/money' : `/money?tab=${item.id}`}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === item.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab companyId={session.user.companyId} />}
      {tab === 'banking' && <BankingTab companyId={session.user.companyId} />}
      {tab === 'accounting' && <AccountingTab companyId={session.user.companyId} />}
    </div>
  );
}

// =============================================================================
// Overview Tab — Cash position + financial summary + trial balance snapshot
// =============================================================================

async function OverviewTab({ companyId }: { companyId: string }) {
  const t = await getTranslations('moneyHub');
  const ta = await getTranslations('accounting');

  const [bankAccounts, financialSummary, trialBalance] = await Promise.all([
    listBankAccounts(db, companyId),
    getFinancialSummary(db, companyId),
    getTrialBalance(db, companyId),
  ]);

  const totalBankBalance = bankAccounts.reduce(
    (sum, a) => sum + Number(a.balance || 0),
    0
  );

  const totals = calculateTrialBalanceTotals(trialBalance);

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('cashPosition')}
          value={formatCurrency(totalBankBalance)}
          icon={<Landmark className="h-5 w-5" />}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          href="/money?tab=banking"
        />
        <StatCard
          label={t('receivables')}
          value={formatCurrency(financialSummary.outstandingTotal)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-100 dark:bg-green-900/30"
          href="/documents?type=invoice&status=sent"
        />
        <StatCard
          label={t('payables')}
          value={formatCurrency(financialSummary.draftsTotal)}
          icon={<TrendingDown className="h-5 w-5" />}
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-100 dark:bg-amber-900/30"
          href="/documents?type=purchase_invoice"
        />
        {financialSummary.overdueTotal > 0 && (
          <StatCard
            label={t('overdue')}
            value={formatCurrency(financialSummary.overdueTotal)}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="text-red-600 dark:text-red-400"
            bgColor="bg-red-100 dark:bg-red-900/30"
            href="/documents?type=invoice&status=overdue"
            count={financialSummary.overdueCount}
          />
        )}
      </div>

      {/* Bank accounts summary */}
      {bankAccounts.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">{t('bankAccounts')}</h2>
            <Link
              href="/money?tab=banking"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t('totalBalance')}: {formatCurrency(totalBankBalance)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {bankAccounts.map((account) => (
              <Link
                key={account.id}
                href={`/banking/${account.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="rounded-lg bg-primary/10 p-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{account.name}</p>
                  {account.bankName && (
                    <p className="text-xs text-muted-foreground">{account.bankName}</p>
                  )}
                </div>
                <p className="text-sm font-semibold">
                  {formatCurrency(account.balance || '0', account.currency || 'CHF')}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trial balance snapshot */}
      {trialBalance.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">{t('trialBalance')}</h2>
            <Link
              href="/money?tab=accounting"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t('accounting')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
            <MiniStat label={ta('assets')} value={totals.assets} color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-100 dark:bg-blue-900/30" icon={<TrendingUp className="h-5 w-5" />} />
            <MiniStat label={ta('liabilities')} value={totals.liabilities} color="text-red-600 dark:text-red-400" bgColor="bg-red-100 dark:bg-red-900/30" icon={<TrendingDown className="h-5 w-5" />} />
            <MiniStat label={ta('equity')} value={totals.equity} color="text-purple-600 dark:text-purple-400" bgColor="bg-purple-100 dark:bg-purple-900/30" icon={<Scale className="h-5 w-5" />} />
            <MiniStat label={ta('revenue')} value={totals.revenue} color="text-green-600 dark:text-green-400" bgColor="bg-green-100 dark:bg-green-900/30" icon={<Coins className="h-5 w-5" />} />
            <MiniStat label={ta('expenses')} value={totals.expenses} color="text-amber-600 dark:text-amber-400" bgColor="bg-amber-100 dark:bg-amber-900/30" icon={<Receipt className="h-5 w-5" />} />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Banking Tab — Bank accounts list (reuses existing pattern)
// =============================================================================

async function BankingTab({ companyId }: { companyId: string }) {
  const t = await getTranslations('banking');
  const accounts = await listBankAccounts(db, companyId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <AddAccountForm />
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <div className="flex flex-col items-center justify-center py-16">
            <Landmark className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{t('noBankAccounts')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('addFirstAccount')}</p>
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
              <div className="flex items-start gap-3">
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
              {account.iban && (
                <p className="mt-3 font-mono text-xs text-muted-foreground">{account.iban}</p>
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

// =============================================================================
// Accounting Tab — Navigation cards to accounting sub-pages
// =============================================================================

async function AccountingTab({ companyId }: { companyId: string }) {
  const t = await getTranslations('accounting');
  const tc = await getTranslations('common');
  const trialBalance = await getTrialBalance(db, companyId);

  const totals = calculateTrialBalanceTotals(trialBalance);

  const hasData = trialBalance.length > 0;

  return (
    <div className="space-y-6">
      {/* Navigation cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard
          href="/accounting/chart-of-accounts"
          icon={<BookOpen className="h-6 w-6" />}
          title={t('chartOfAccounts')}
          description={t('manageChartOfAccounts')}
        />
        <NavCard
          href="/accounting/journal"
          icon={<FileSpreadsheet className="h-6 w-6" />}
          title={t('journal')}
          description={t('viewJournalEntries')}
        />
        <NavCard
          href="/accounting/fiscal-years"
          icon={<Calendar className="h-6 w-6" />}
          title={t('fiscalYears')}
          description={t('manageFiscalYears')}
        />
      </div>

      {/* Trial Balance Summary */}
      {hasData && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">{t('trialBalance')}</h2>
            <Link
              href="/accounting/chart-of-accounts"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {tc('viewDetails')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
            <MiniStat label={t('assets')} value={totals.assets} color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-100 dark:bg-blue-900/30" icon={<TrendingUp className="h-5 w-5" />} />
            <MiniStat label={t('liabilities')} value={totals.liabilities} color="text-red-600 dark:text-red-400" bgColor="bg-red-100 dark:bg-red-900/30" icon={<TrendingDown className="h-5 w-5" />} />
            <MiniStat label={t('equity')} value={totals.equity} color="text-purple-600 dark:text-purple-400" bgColor="bg-purple-100 dark:bg-purple-900/30" icon={<Scale className="h-5 w-5" />} />
            <MiniStat label={t('revenue')} value={totals.revenue} color="text-green-600 dark:text-green-400" bgColor="bg-green-100 dark:bg-green-900/30" icon={<Coins className="h-5 w-5" />} />
            <MiniStat label={t('expenses')} value={totals.expenses} color="text-amber-600 dark:text-amber-400" bgColor="bg-amber-100 dark:bg-amber-900/30" icon={<Receipt className="h-5 w-5" />} />
          </div>
        </div>
      )}
    </div>
  );
}
