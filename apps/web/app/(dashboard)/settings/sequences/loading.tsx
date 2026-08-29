import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="rounded-xl border bg-card">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-4 border-b px-6 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-8" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-4 border-b px-6 py-4 last:border-b-0"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
