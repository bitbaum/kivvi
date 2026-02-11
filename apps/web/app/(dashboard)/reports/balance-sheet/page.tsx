import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Scale, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getBalanceSheet } from '@kivvi/core';
import { formatCurrency } from '@/lib/utils';
import { DatePickerForm } from '../date-picker-form';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BalanceSheetPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const params = await searchParams;
  const asOfDate =
    (params.asOfDate as string) || new Date().toISOString().split('T')[0];

  const report = await getBalanceSheet(db, session.user.companyId, asOfDate);

  const hasData =
    report.assets.length > 0 ||
    report.liabilities.length > 0 ||
    report.equity.length > 0;

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
        <h1 className="text-3xl font-bold">Balance Sheet</h1>
        <p className="text-muted-foreground">
          Bilanz &mdash; Assets, liabilities, and equity as of a specific date.
        </p>
      </div>

      {/* Date Picker */}
      <div className="rounded-xl border bg-card p-4">
        <DatePickerForm defaultDate={asOfDate} />
      </div>

      {!hasData ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10" />
          <p className="text-lg font-medium">No data available</p>
          <p className="mt-1 text-sm">
            There are no journal entries as of {asOfDate}. Try selecting a later
            date.
          </p>
        </div>
      ) : (
        <>
          {/* Assets */}
          <BalanceSection
            title="Assets"
            subtitle="Aktiven"
            rows={report.assets}
            total={report.totalAssets}
            color="text-blue-600 dark:text-blue-400"
          />

          {/* Liabilities */}
          <BalanceSection
            title="Liabilities"
            subtitle="Fremdkapital"
            rows={report.liabilities}
            total={report.totalLiabilities}
            color="text-red-600 dark:text-red-400"
          />

          {/* Equity */}
          <BalanceSection
            title="Equity"
            subtitle="Eigenkapital"
            rows={report.equity}
            total={report.totalEquity}
            color="text-purple-600 dark:text-purple-400"
          />

          {/* Balance Check */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Balance Check</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(report.totalAssets)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  Total Liabilities
                </p>
                <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(report.totalLiabilities)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">Total Equity</p>
                <p className="mt-1 text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(report.totalEquity)}
                </p>
              </div>
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Retained Earnings
                </p>
                <p
                  className={`mt-1 text-xl font-bold ${
                    report.retainedEarnings >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(report.retainedEarnings)}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Total Assets ({formatCurrency(report.totalAssets)}) = Total
              Liabilities ({formatCurrency(report.totalLiabilities)}) + Total
              Equity ({formatCurrency(report.totalEquity)}) + Retained Earnings
              ({formatCurrency(report.retainedEarnings)})
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BalanceSection({
  title,
  subtitle,
  rows,
  total,
  color,
}: {
  title: string;
  subtitle: string;
  rows: { accountCode: string; accountName: string; balance: number }[];
  total: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b p-4">
        <Scale className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">({subtitle})</span>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.accountCode} className="hover:bg-muted/50">
                  <td className="px-6 py-3 font-mono text-muted-foreground">
                    {row.accountCode}
                  </td>
                  <td className="px-6 py-3">{row.accountName}</td>
                  <td className="px-6 py-3 text-right font-medium">
                    {formatCurrency(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold">
                <td className="px-6 py-3" colSpan={2}>
                  Total {title}
                </td>
                <td className={`px-6 py-3 text-right ${color}`}>
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="p-6 text-sm text-muted-foreground">
          No {title.toLowerCase()} recorded.
        </p>
      )}
    </div>
  );
}
