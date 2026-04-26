import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic loading skeleton for document-list pages
 * (sales/{quotes,orders,invoices,delivery-notes,credit-notes},
 *  purchasing/{purchase-orders,purchase-invoices}, accounting/journal …).
 *
 * Renders the same coarse structure as those pages: header + filters/pills,
 * a table with 8 placeholder rows, and a pagination strip. Used directly
 * from each route's `loading.tsx`.
 */
export function DocumentListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-44" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>

      {/* Filters: search + status pills */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {/* Table header */}
        <div className="flex gap-4 border-b px-6 py-3">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Table rows */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b px-6 py-4 last:border-b-0"
          >
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-18 rounded-full" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
