import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, TrendingUp, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProfitAndLoss } from '@kivvi/core';
import { formatCurrency } from '@/lib/utils';
import { DateRangeForm } from '../date-range-form';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProfitLossPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const params = await searchParams;
  const now = new Date();
  const startDate = (params.start as string) || `${now.getFullYear()}-01-01`;
  const endDate = (params.end as string) || `${now.getFullYear()}-12-31`;

  const report = await getProfitAndLoss(
    db,
    session.user.companyId,
    startDate,
    endDate
  );

  const hasData = report.revenue.length > 0 || report.expenses.length > 0;

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
        <h1 className="text-3xl font-bold">Profit & Loss</h1>
        <p className="text-muted-foreground">
          Erfolgsrechnung &mdash; Revenue and expense summary for the selected
          period.
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="rounded-xl border bg-card p-4">
        <DateRangeForm defaultStart={startDate} defaultEnd={endDate} />
      </div>

      {!hasData ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10" />
          <p className="text-lg font-medium">No data for this period</p>
          <p className="mt-1 text-sm">
            There are no journal entries between {startDate} and {endDate}. Try
            adjusting the date range.
          </p>
        </div>
      ) : (
        <>
          {/* Revenue Section */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b p-4">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="font-semibold">Revenue</h2>
            </div>
            {report.revenue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3">Account</th>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.revenue.map((row) => (
                      <tr key={row.accountCode} className="hover:bg-muted/50">
                        <td className="px-6 py-3 font-mono text-muted-foreground">
                          {row.accountCode}
                        </td>
                        <td className="px-6 py-3">{row.accountName}</td>
                        <td className="px-6 py-3 text-right font-medium">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="px-6 py-3" colSpan={2}>
                        Total Revenue
                      </td>
                      <td className="px-6 py-3 text-right text-green-600 dark:text-green-400">
                        {formatCurrency(report.totalRevenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                No revenue entries for this period.
              </p>
            )}
          </div>

          {/* Expenses Section */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b p-4">
              <TrendingUp className="h-5 w-5 rotate-180 text-red-600 dark:text-red-400" />
              <h2 className="font-semibold">Expenses</h2>
            </div>
            {report.expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3">Account</th>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.expenses.map((row) => (
                      <tr key={row.accountCode} className="hover:bg-muted/50">
                        <td className="px-6 py-3 font-mono text-muted-foreground">
                          {row.accountCode}
                        </td>
                        <td className="px-6 py-3">{row.accountName}</td>
                        <td className="px-6 py-3 text-right font-medium">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="px-6 py-3" colSpan={2}>
                        Total Expenses
                      </td>
                      <td className="px-6 py-3 text-right text-red-600 dark:text-red-400">
                        {formatCurrency(report.totalExpenses)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                No expense entries for this period.
              </p>
            )}
          </div>

          {/* Net Income Summary */}
          <div className="rounded-xl border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(report.totalRevenue)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(report.totalExpenses)}
                </p>
              </div>
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Net Income
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    report.netIncome >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(report.netIncome)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
