import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-52" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <div className="rounded-xl border bg-card">
        <div className="flex gap-4 border-b px-6 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b px-6 py-4 last:border-b-0"
          >
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
