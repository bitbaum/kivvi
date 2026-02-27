import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Receipt, FileText, Calendar } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getVatReport } from '@kivvi/core';
import { formatCurrency } from '@/lib/utils';
import { DateRangeForm } from '../date-range-form';
import { ExportButton } from '../export-button';
import { EmptyState } from '@/components/empty-state';
import { getTranslations } from 'next-intl/server';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getCurrentQuarter(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3);
  const startMonth = quarter * 3;
  const endMonth = startMonth + 2;

  const start = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;

  // Last day of the end month
  const lastDay = new Date(year, endMonth + 1, 0).getDate();
  const end = `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { start, end };
}

export default async function VatReportPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('reports');
  const tc = await getTranslations('common');

  const params = await searchParams;
  const defaults = getCurrentQuarter();
  const startDate = (params.start as string) || defaults.start;
  const endDate = (params.end as string) || defaults.end;

  const report = await getVatReport(
    db,
    session.user.companyId,
    startDate,
    endDate
  );

  const hasData = report.salesVat.length > 0 || report.purchaseVat.length > 0;

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
            <h1 className="text-3xl font-bold">{t('vatReport')}</h1>
            <p className="text-muted-foreground">
              {t('vatReportDesc')}
            </p>
          </div>
          <ExportButton
            reportType="vat"
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
          icon={Calendar}
          title={t('noVatData')}
          description={t('noVatDataDesc', { start: startDate, end: endDate })}
          actionLabel={tc('createInvoice')}
          actionHref="/sales/invoices/new"
          secondaryActionLabel={tc('adjustDateRange')}
        />
      ) : (
        <>
          {/* Sales VAT */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b p-4">
              <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold">{t('salesVat')}</h2>
            </div>
            {report.salesVat.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3">{t('rate')}</th>
                      <th className="px-6 py-3 text-right">{t('taxableAmount')}</th>
                      <th className="px-6 py-3 text-right">{t('vatAmount')}</th>
                      <th className="px-6 py-3 text-right">{tc('number')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.salesVat.map((row) => (
                      <tr key={row.rate} className="hover:bg-muted/50">
                        <td className="px-6 py-3 font-medium">{row.rate}%</td>
                        <td className="px-6 py-3 text-right">
                          {formatCurrency(row.taxableAmount)}
                        </td>
                        <td className="px-6 py-3 text-right font-medium">
                          {formatCurrency(row.vatAmount)}
                        </td>
                        <td className="px-6 py-3 text-right text-muted-foreground">
                          {row.documentCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="px-6 py-3" colSpan={2}>
                        {t('salesVat')} {tc('total')}
                      </td>
                      <td className="px-6 py-3 text-right text-blue-600 dark:text-blue-400">
                        {formatCurrency(report.totalSalesVat)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                {t('noSalesVatEntries')}
              </p>
            )}
          </div>

          {/* Purchase VAT */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b p-4">
              <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h2 className="font-semibold">{t('purchaseVat')}</h2>
            </div>
            {report.purchaseVat.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3">{t('rate')}</th>
                      <th className="px-6 py-3 text-right">{t('taxableAmount')}</th>
                      <th className="px-6 py-3 text-right">{t('vatAmount')}</th>
                      <th className="px-6 py-3 text-right">{tc('number')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.purchaseVat.map((row) => (
                      <tr key={row.rate} className="hover:bg-muted/50">
                        <td className="px-6 py-3 font-medium">{row.rate}%</td>
                        <td className="px-6 py-3 text-right">
                          {formatCurrency(row.taxableAmount)}
                        </td>
                        <td className="px-6 py-3 text-right font-medium">
                          {formatCurrency(row.vatAmount)}
                        </td>
                        <td className="px-6 py-3 text-right text-muted-foreground">
                          {row.documentCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="px-6 py-3" colSpan={2}>
                        {t('purchaseVat')} {tc('total')}
                      </td>
                      <td className="px-6 py-3 text-right text-amber-600 dark:text-amber-400">
                        {formatCurrency(report.totalPurchaseVat)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                {t('noPurchaseVatEntries')}
              </p>
            )}
          </div>

          {/* VAT Payable Summary */}
          <div
            className={`rounded-xl border-2 p-6 ${
              Number(report.vatPayable) >= 0
                ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
                : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
            }`}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('salesVat')} {tc('total')}
                </p>
                <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(report.totalSalesVat)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('purchaseVat')} {tc('total')}
                </p>
                <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                  - {formatCurrency(report.totalPurchaseVat)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {Number(report.vatPayable) >= 0 ? t('vatPayable') : t('vatRefundable')}
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    Number(report.vatPayable) >= 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {formatCurrency(Math.abs(Number(report.vatPayable)))}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
