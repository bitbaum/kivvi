import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getJournalEntry } from '@kivvi/core';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { DeleteJournalEntryButton } from './delete-button';
import { getTranslations } from 'next-intl/server';

const SOURCE_TYPE_STYLES: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  invoice: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  payment: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JournalEntryDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('accounting');
  const tc = await getTranslations('common');

  const SOURCE_TYPE_LABELS: Record<string, string> = {
    manual: t('manual'),
    invoice: 'Invoice',
    payment: 'Payment',
  };

  const { id } = await params;
  const entry = await getJournalEntry(db, session.user.companyId, id);

  if (!entry) {
    notFound();
  }

  const totalDebits = entry.lines.reduce(
    (sum, line) => sum + (Number(line.debit) || 0),
    0
  );
  const totalCredits = entry.lines.reduce(
    (sum, line) => sum + (Number(line.credit) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/accounting/journal"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('back')} {t('journal')}
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {entry.reference || t('journalEntry')}
              </h1>
              <span
                className={cn(
                  'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                  SOURCE_TYPE_STYLES[entry.sourceType ?? 'manual'] || SOURCE_TYPE_STYLES.manual
                )}
              >
                {SOURCE_TYPE_LABELS[entry.sourceType ?? 'manual'] || entry.sourceType}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {entry.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {entry.sourceType === 'manual' && (
              <DeleteJournalEntryButton entryId={entry.id} />
            )}
          </div>
        </div>
      </div>

      {/* Entry info */}
      <div className="rounded-xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">{tc('date')}</p>
            <p className="font-medium">{formatDate(entry.date)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('reference')}</p>
            <p className="font-medium">{entry.reference || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('sourceType')}</p>
            <p className="font-medium">
              {SOURCE_TYPE_LABELS[entry.sourceType ?? 'manual'] || entry.sourceType}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{tc('date')}</p>
            <p className="font-medium">{formatDate(entry.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Lines table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Journal Lines
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-6 py-3 text-left font-medium">{t('account')}</th>
                <th className="px-6 py-3 text-left font-medium">{tc('description')}</th>
                <th className="px-6 py-3 text-right font-medium">{t('debit')}</th>
                <th className="px-6 py-3 text-right font-medium">{t('credit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entry.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-6 py-3">
                    {line.account ? (
                      <span>
                        <span className="font-mono text-muted-foreground">
                          {line.account.code}
                        </span>
                        {' '}
                        <span className="font-medium">{line.account.name}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t('unknownAccount')}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {line.description || '-'}
                  </td>
                  <td className="px-6 py-3 text-right font-medium">
                    {Number(line.debit) > 0 ? formatCurrency(Number(line.debit)) : ''}
                  </td>
                  <td className="px-6 py-3 text-right font-medium">
                    {Number(line.credit) > 0 ? formatCurrency(Number(line.credit)) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold">
                <td className="px-6 py-3" colSpan={2}>
                  {tc('total')}
                </td>
                <td className="px-6 py-3 text-right">
                  {formatCurrency(totalDebits)}
                </td>
                <td className="px-6 py-3 text-right">
                  {formatCurrency(totalCredits)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
