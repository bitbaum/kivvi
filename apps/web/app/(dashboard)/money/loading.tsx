import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-9 w-36" /><Skeleton className="mt-2 h-4 w-64" /></div>
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-9 w-28 rounded-lg" />))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card">
        <div className="flex gap-4 border-b px-6 py-3">
          <Skeleton className="h-4 w-32 flex-1" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-24" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-6 py-4 last:border-b-0">
            <Skeleton className="h-4 w-40 flex-1" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
