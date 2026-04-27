import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-36" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Bank account cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-9 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-1 h-3 w-24" />
              </div>
            </div>
            <Skeleton className="mt-3 h-3 w-48 font-mono" />
            <div className="mt-4 flex items-end justify-between">
              <div>
                <Skeleton className="h-3 w-12" />
                <Skeleton className="mt-1 h-6 w-28" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
