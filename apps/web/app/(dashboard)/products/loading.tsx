import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-36" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      {/* Filters: search + type tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-52 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {/* Table header */}
        <div className="flex gap-4 border-b px-6 py-3">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
        {/* Table rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-6 py-4 last:border-b-0">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-44 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
