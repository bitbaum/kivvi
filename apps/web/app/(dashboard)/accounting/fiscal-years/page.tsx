import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Calendar } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listFiscalYears } from '@kivvi/core';
import { formatDate } from '@/lib/utils';
import { NewYearForm } from './new-year-form';

export default async function FiscalYearsPage() {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const fiscalYears = await listFiscalYears(db, session.user.companyId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fiscal Years</h1>
          <p className="text-muted-foreground">
            Manage your fiscal years and accounting periods.
          </p>
        </div>
      </div>

      {/* Create form */}
      <NewYearForm />

      {/* List */}
      <div className="rounded-xl border bg-card">
        {fiscalYears.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No fiscal years</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first fiscal year to get started with accounting.
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div>Name</div>
              <div>Start Date</div>
              <div>End Date</div>
              <div>Status</div>
            </div>

            {/* Table rows */}
            <div className="divide-y">
              {fiscalYears.map((year) => (
                <Link
                  key={year.id}
                  href={`/accounting/fiscal-years/${year.id}`}
                  className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="text-sm font-medium">{year.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(year.startDate)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(year.endDate)}
                  </div>
                  <div>
                    <span
                      className={
                        year.isClosed
                          ? 'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          : 'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }
                    >
                      {year.isClosed ? 'Closed' : 'Open'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
