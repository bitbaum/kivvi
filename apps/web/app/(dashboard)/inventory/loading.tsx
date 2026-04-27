import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>

      {/* Low stock alerts placeholder */}
      <div className="rounded-xl border border-warning/20 bg-warning/5">
        <div className="flex items-center gap-2 border-b border-warning/20 p-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="ml-auto h-5 w-16 rounded-full" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-40 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Warehouse section */}
      <div>
        <Skeleton className="mb-4 h-6 w-24" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-9 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-1 h-3 w-36" />
                  </div>
                </div>
                {i === 0 && <Skeleton className="h-5 w-20 rounded-full" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
