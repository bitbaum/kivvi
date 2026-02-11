import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Clock, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getAgingReport } from '@kivvi/core';
import { formatCurrency } from '@/lib/utils';
import { DatePickerForm } from '../date-picker-form';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AgingReportPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const params = await searchParams;
  const asOfDate =
    (params.asOfDate as string) || new Date().toISOString().split('T')[0];

  const report = await getAgingReport(db, session.user.companyId, asOfDate);

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
        <h1 className="text-3xl font-bold">Aging Report</h1>
        <p className="text-muted-foreground">
          Altersanalyse &mdash; Outstanding receivables broken down by age.
        </p>
      </div>

      {/* Date Picker */}
      <div className="rounded-xl border bg-card p-4">
        <DatePickerForm defaultDate={asOfDate} />
      </div>

      {!hasData ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10" />
          <p className="text-lg font-medium">No outstanding receivables</p>
          <p className="mt-1 text-sm">
            There are no unpaid invoices as of {asOfDate}.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-4">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold">
              Receivables as of {asOfDate}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3 text-right">
                    <span className="text-green-600 dark:text-green-400">
                      Current
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <span className="text-yellow-600 dark:text-yellow-400">
                      1-30 days
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <span className="text-orange-600 dark:text-orange-400">
                      31-60 days
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <span className="text-red-500 dark:text-red-400">
                      61-90 days
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <span className="text-red-700 dark:text-red-300">
                      &gt;90 days
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.rows.map((row) => (
                  <tr key={row.contactId} className="hover:bg-muted/50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/contacts/${row.contactId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.contactName}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-right text-green-600 dark:text-green-400">
                      {row.current > 0 ? formatCurrency(row.current) : '-'}
                    </td>
                    <td className="px-6 py-3 text-right text-yellow-600 dark:text-yellow-400">
                      {row.days30 > 0 ? formatCurrency(row.days30) : '-'}
                    </td>
                    <td className="px-6 py-3 text-right text-orange-600 dark:text-orange-400">
                      {row.days60 > 0 ? formatCurrency(row.days60) : '-'}
                    </td>
                    <td className="px-6 py-3 text-right text-red-500 dark:text-red-400">
                      {row.days90 > 0 ? formatCurrency(row.days90) : '-'}
                    </td>
                    <td className="px-6 py-3 text-right text-red-700 dark:text-red-300">
                      {row.over90 > 0 ? formatCurrency(row.over90) : '-'}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="px-6 py-3">Totals</td>
                  <td className="px-6 py-3 text-right text-green-600 dark:text-green-400">
                    {report.totals.current > 0
                      ? formatCurrency(report.totals.current)
                      : '-'}
                  </td>
                  <td className="px-6 py-3 text-right text-yellow-600 dark:text-yellow-400">
                    {report.totals.days30 > 0
                      ? formatCurrency(report.totals.days30)
                      : '-'}
                  </td>
                  <td className="px-6 py-3 text-right text-orange-600 dark:text-orange-400">
                    {report.totals.days60 > 0
                      ? formatCurrency(report.totals.days60)
                      : '-'}
                  </td>
                  <td className="px-6 py-3 text-right text-red-500 dark:text-red-400">
                    {report.totals.days90 > 0
                      ? formatCurrency(report.totals.days90)
                      : '-'}
                  </td>
                  <td className="px-6 py-3 text-right text-red-700 dark:text-red-300">
                    {report.totals.over90 > 0
                      ? formatCurrency(report.totals.over90)
                      : '-'}
                  </td>
                  <td className="px-6 py-3 text-right text-lg">
                    {formatCurrency(report.totals.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
