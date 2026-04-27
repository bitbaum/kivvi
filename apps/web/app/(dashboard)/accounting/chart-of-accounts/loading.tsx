import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div>
            <Skeleton className="h-10 w-52" />
            <Skeleton className="mt-2 h-4 w-44" />
          </div>
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Filters: search + type tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-10 w-full rounded-lg sm:max-w-sm" />
        <Skeleton className="h-10 w-80 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {/* Table header */}
        <div className="grid grid-cols-[80px_1fr_auto_auto_auto] gap-4 border-b px-6 py-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="ml-auto h-3 w-8" />
        </div>
        {/* Table rows */}
        <div className="divide-y">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[80px_1fr_auto_auto_auto] items-center gap-4 px-6 py-4"
            >
              <Skeleton className="h-4 w-12 font-mono" />
              <div>
                <Skeleton className="h-4 w-40" />
                {i % 3 === 1 && <Skeleton className="mt-1 h-3 w-32" />}
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <div className="flex items-center justify-end gap-2">
                <Skeleton className="h-7 w-12 rounded-md" />
                <Skeleton className="h-7 w-12 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="border-t px-6 py-3">
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
    </div>
  );
}
