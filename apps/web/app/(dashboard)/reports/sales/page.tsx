import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, BarChart3, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSalesReport } from '@kivvi/core';
import { formatCurrency } from '@/lib/utils';
import { DateRangeForm } from '../date-range-form';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SalesReportPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

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
          Back to Reports
        </Link>
        <h1 className="text-3xl font-bold">Sales Report</h1>
        <p className="text-muted-foreground">
          Umsatzbericht &mdash; Monthly sales breakdown for the selected period.
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="rounded-xl border bg-card p-4">
        <DateRangeForm defaultStart={startDate} defaultEnd={endDate} />
      </div>

      {!hasData ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10" />
          <p className="text-lg font-medium">No sales data for this period</p>
          <p className="mt-1 text-sm">
            There are no invoices between {startDate} and {endDate}. Try
            adjusting the date range.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-4">
            <BarChart3 className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h2 className="font-semibold">Monthly Sales</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">Month</th>
                  <th className="px-6 py-3 text-right">Invoices</th>
                  <th className="px-6 py-3 text-right">Revenue</th>
                  <th className="px-6 py-3 text-right">VAT</th>
                  <th className="px-6 py-3 text-right">Credit Notes</th>
                  <th className="px-6 py-3 text-right">Credit Amount</th>
                  <th className="px-6 py-3 text-right">Net Revenue</th>
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
                  <td className="px-6 py-3">Totals</td>
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
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="mt-1 text-xl font-bold">
                  {formatCurrency(report.totals.revenue)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  from {report.totals.invoiceCount} invoices
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">Credit Notes</p>
                <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                  {report.totals.creditNoteAmount > 0
                    ? `- ${formatCurrency(report.totals.creditNoteAmount)}`
                    : formatCurrency(0)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {report.totals.creditNoteCount} credit notes
                </p>
              </div>
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Net Revenue
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
