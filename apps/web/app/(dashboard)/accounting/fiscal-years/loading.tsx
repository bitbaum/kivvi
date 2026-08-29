import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="rounded-xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Skeleton className="h-3.5 w-16 mb-1.5" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-3.5 w-20 mb-1.5" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-3.5 w-20 mb-1.5" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-card">
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b px-6 py-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b px-6 py-4 last:border-b-0"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
