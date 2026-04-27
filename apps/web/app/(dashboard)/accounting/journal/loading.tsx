import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>

      {/* Filters: search + source type tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-10 w-full rounded-lg sm:max-w-sm" />
        <Skeleton className="h-10 w-64 rounded-lg" />
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Skeleton className="mb-1 h-3 w-10" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div>
          <Skeleton className="mb-1 h-3 w-10" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-16 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {/* Table header */}
        <div className="hidden border-b px-4 py-3 sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto]">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mx-4 h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-12" />
        </div>
        {/* Table rows */}
        <div className="divide-y">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-1 p-4 sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto] sm:items-center sm:gap-4"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24 font-mono" />
              <Skeleton className="h-4 w-full max-w-xs" />
              <Skeleton className="mx-4 h-5 w-16 rounded-full" />
              <Skeleton className="ml-auto h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
