import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, BarChart3, FileText, TrendingUp } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSalesReport } from '@kivvi/core';
import { formatCurrency } from '@/lib/utils';
import { DateRangeForm } from '../date-range-form';
import { ExportButton } from '../export-button';
import { EmptyState } from '@/components/empty-state';
import { getTranslations } from 'next-intl/server';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SalesReportPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('reports');
  const tc = await getTranslations('common');
  const ta = await getTranslations('accounting');

  const params = await searchParams;
  const now = new Date();
  const startDate = (params.start as string) || `${now.getFullYear()}-01-01`;
  const endDate = (params.end as string) || `${now.getFullYear()}-12-31`;

  const report = await getSalesReport(
    db,
    session.user.companyId,
    startDate,
    endDate
  );

  const hasData = report.rows.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/reports"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('back')} {t('title')}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('salesReport')}</h1>
            <p className="text-muted-foreground">
              {t('salesReportDesc')}
            </p>
          </div>
          <ExportButton
            reportType="sales"
            startDate={startDate}
            endDate={endDate}
            disabled={!hasData}
          />
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="rounded-xl border bg-card p-4">
        <DateRangeForm defaultStart={startDate} defaultEnd={endDate} />
      </div>

      {!hasData ? (
        <EmptyState
          icon={TrendingUp}
          title={t('noSalesData')}
          description={t('noSalesDataDesc', { start: startDate, end: endDate })}
          actionLabel={tc('createInvoice')}
          actionHref="/sales/invoices/new"
          secondaryActionLabel={tc('adjustDateRange')}
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-4">
            <BarChart3 className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h2 className="font-semibold">{t('monthlySales')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">{t('month')}</th>
                  <th className="px-6 py-3 text-right">{t('invoiceCount')}</th>
                  <th className="px-6 py-3 text-right">{t('revenueGross')}</th>
                  <th className="px-6 py-3 text-right">{t('vatAmount')}</th>
                  <th className="px-6 py-3 text-right">{t('creditNoteCount')}</th>
                  <th className="px-6 py-3 text-right">{tc('amount')}</th>
                  <th className="px-6 py-3 text-right">{t('netRevenue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.rows.map((row) => (
                  <tr key={row.month} className="hover:bg-muted/50">
                    <td className="px-6 py-3 font-medium">{row.month}</td>
                    <td className="px-6 py-3 text-right text-muted-foreground">
                      {row.invoiceCount}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground">
                      {formatCurrency(row.vatAmount)}
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground">
                      {row.creditNoteCount > 0 ? row.creditNoteCount : '-'}
                    </td>
                    <td className="px-6 py-3 text-right text-red-600 dark:text-red-400">
                      {row.creditNoteAmount > 0
                        ? `- ${formatCurrency(row.creditNoteAmount)}`
                        : '-'}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-medium ${
                        row.netRevenue >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatCurrency(row.netRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="px-6 py-3">{tc('totals')}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">
                    {report.totals.invoiceCount}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {formatCurrency(report.totals.revenue)}
                  </td>
                  <td className="px-6 py-3 text-right text-muted-foreground">
                    {formatCurrency(report.totals.vatAmount)}
                  </td>
                  <td className="px-6 py-3 text-right text-muted-foreground">
                    {report.totals.creditNoteCount > 0
                      ? report.totals.creditNoteCount
                      : '-'}
                  </td>
                  <td className="px-6 py-3 text-right text-red-600 dark:text-red-400">
                    {report.totals.creditNoteAmount > 0
                      ? `- ${formatCurrency(report.totals.creditNoteAmount)}`
                      : '-'}
                  </td>
                  <td
                    className={`px-6 py-3 text-right text-lg ${
                      report.totals.netRevenue >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatCurrency(report.totals.netRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary Cards */}
          <div className="border-t p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">{ta('revenue')} {tc('total')}</p>
                <p className="mt-1 text-xl font-bold">
                  {formatCurrency(report.totals.revenue)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('fromInvoices', { count: report.totals.invoiceCount })}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">{t('creditNoteCount')}</p>
                <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                  {report.totals.creditNoteAmount > 0
                    ? `- ${formatCurrency(report.totals.creditNoteAmount)}`
                    : formatCurrency(0)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('creditNotesCount', { count: report.totals.creditNoteCount })}
                </p>
              </div>
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('netRevenue')}
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    report.totals.netRevenue >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(report.totals.netRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
