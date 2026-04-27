import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-16" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {/* Table header */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b px-6 py-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-4" />
        </div>
        {/* Table rows */}
        <div className="divide-y">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 px-6 py-4"
            >
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
