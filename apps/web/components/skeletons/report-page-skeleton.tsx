import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for report pages (P&L, Balance Sheet, VAT, Sales, Aging).
 * Renders: back link, header, date range controls, table.
 */
export function ReportPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-32" />

      {/* Header */}
      <div>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {/* Date range controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Skeleton className="h-3.5 w-16 mb-1.5" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-3.5 w-16 mb-1.5" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Report table */}
      <div className="rounded-xl border bg-card">
        <div className="flex gap-4 border-b px-6 py-3">
          <Skeleton className="h-4 w-48 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-6 py-3 last:border-b-0">
            <Skeleton className="h-4 w-56 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
