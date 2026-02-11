import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Search, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listJournalEntries } from '@kivvi/core';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: 'Manual',
  invoice: 'Invoice',
  payment: 'Payment',
};

const SOURCE_TYPE_STYLES: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  invoice: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  payment: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
    sourceType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

export default async function JournalPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const sourceType = params.sourceType;
  const search = params.search;
  const dateFrom = params.dateFrom;
  const dateTo = params.dateTo;

  const result = await listJournalEntries(db, session.user.companyId, {
    search: search || undefined,
    sourceType: sourceType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Journal</h1>
          <p className="text-muted-foreground">
            View and manage journal entries.
          </p>
        </div>
        <Link
          href="/accounting/journal/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Entry
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <form className="relative flex-1 sm:max-w-sm" action="/accounting/journal" method="GET">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder="Search entries..."
            defaultValue={search}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {sourceType && <input type="hidden" name="sourceType" value={sourceType} />}
          {dateFrom && <input type="hidden" name="dateFrom" value={dateFrom} />}
          {dateTo && <input type="hidden" name="dateTo" value={dateTo} />}
        </form>

        {/* Source type filter */}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <SourceTypeFilterLink label="All" value="" current={sourceType} search={search} dateFrom={dateFrom} dateTo={dateTo} />
          <SourceTypeFilterLink label="Manual" value="manual" current={sourceType} search={search} dateFrom={dateFrom} dateTo={dateTo} />
          <SourceTypeFilterLink label="Invoice" value="invoice" current={sourceType} search={search} dateFrom={dateFrom} dateTo={dateTo} />
          <SourceTypeFilterLink label="Payment" value="payment" current={sourceType} search={search} dateFrom={dateFrom} dateTo={dateTo} />
        </div>
      </div>

      {/* Date range filter */}
      <form className="flex flex-wrap items-end gap-3" action="/accounting/journal" method="GET">
        {search && <input type="hidden" name="search" value={search} />}
        {sourceType && <input type="hidden" name="sourceType" value={sourceType} />}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">From</label>
          <input
            type="date"
            name="dateFrom"
            defaultValue={dateFrom}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">To</label>
          <input
            type="date"
            name="dateTo"
            defaultValue={dateTo}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          Filter
        </button>
        {(dateFrom || dateTo) && (
          <Link
            href={buildFilterUrl({ search, sourceType })}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear dates
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No journal entries found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || sourceType || dateFrom || dateTo
                ? 'Try adjusting your search or filters.'
                : 'Get started by creating your first journal entry.'}
            </p>
            {!search && !sourceType && (
              <Link
                href="/accounting/journal/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                New Entry
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden border-b px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto]">
              <span className="w-24">Date</span>
              <span>Reference</span>
              <span>Description</span>
              <span className="px-4 text-center">Source</span>
              <span className="w-28 text-right">Total</span>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {result.data.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/accounting/journal/${entry.id}`}
                  className="flex flex-col gap-1 p-4 hover:bg-muted/50 transition-colors sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto] sm:items-center sm:gap-4"
                >
                  <div className="w-24 text-sm text-muted-foreground">
                    {formatDate(entry.date)}
                  </div>
                  <div className="text-sm font-medium font-mono">
                    {entry.reference || '-'}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {entry.description}
                  </div>
                  <div className="px-4 text-center">
                    <span
                      className={cn(
                        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                        SOURCE_TYPE_STYLES[entry.sourceType ?? 'manual'] || SOURCE_TYPE_STYLES.manual
                      )}
                    >
                      {SOURCE_TYPE_LABELS[entry.sourceType ?? 'manual'] || entry.sourceType}
                    </span>
                  </div>
                  <div className="w-28 text-right text-sm font-medium">
                    {/* Total will be calculated from lines on the detail page;
                        here we don't have lines so we just show a dash or use
                        any aggregated field if available */}
                    -
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(result.page - 1) * result.pageSize + 1} to{' '}
                  {Math.min(result.page * result.pageSize, result.total)} of{' '}
                  {result.total} entries
                </p>
                <div className="flex items-center gap-2">
                  {result.page > 1 ? (
                    <Link
                      href={buildPageUrl(result.page - 1, { search, sourceType, dateFrom, dateTo })}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </span>
                  )}

                  <span className="text-sm text-muted-foreground">
                    Page {result.page} of {result.totalPages}
                  </span>

                  {result.page < result.totalPages ? (
                    <Link
                      href={buildPageUrl(result.page + 1, { search, sourceType, dateFrom, dateTo })}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS & FUNCTIONS
// ============================================================================

function SourceTypeFilterLink({
  label,
  value,
  current,
  search,
  dateFrom,
  dateTo,
}: {
  label: string;
  value: string;
  current?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const isActive = (current || '') === value;
  const href = buildFilterUrl({ search, sourceType: value || undefined, dateFrom, dateTo });

  return (
    <Link
      href={href}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </Link>
  );
}

function buildFilterUrl(filters: {
  search?: string;
  sourceType?: string;
  dateFrom?: string;
  dateTo?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.sourceType) params.set('sourceType', filters.sourceType);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  return `/accounting/journal${params.toString() ? `?${params.toString()}` : ''}`;
}

function buildPageUrl(
  page: number,
  filters: { search?: string; sourceType?: string; dateFrom?: string; dateTo?: string }
): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.sourceType) params.set('sourceType', filters.sourceType);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (page > 1) params.set('page', page.toString());
  return `/accounting/journal${params.toString() ? `?${params.toString()}` : ''}`;
}
