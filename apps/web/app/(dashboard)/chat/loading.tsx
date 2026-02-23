import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <Skeleton className="h-16 w-16 rounded-2xl" />
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-3 sm:grid-cols-2 mt-4">
        {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-10 w-48 rounded-lg" />))}
      </div>
    </div>
  );
}
