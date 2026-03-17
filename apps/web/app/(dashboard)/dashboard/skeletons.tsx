import { Skeleton } from "@/components/ui/skeleton";

export function ExecutiveSummarySkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-full max-w-2xl" />
    </div>
  );
}

export function PriorityActionsSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="mt-2 h-4 w-full max-w-lg" />
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="mt-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-[300px] w-full" />
          <Skeleton className="mt-3 h-4 w-full max-w-md" />
        </div>
      ))}
    </div>
  );
}

export function HealthMetricsSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <div className="mt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentActivitySkeleton() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-2 h-4 w-52" />
      </div>
      <div className="divide-y">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-1 h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIAssistantSkeleton() {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-green-50 p-6 dark:from-emerald-950/20 dark:to-green-950/20">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// Legacy skeletons kept for backwards compatibility
export function QuickActionsSkeleton() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="mt-3 h-5 w-24" />
            <Skeleton className="mt-2 h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-4 w-full max-w-md" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkflowSuggestionsSkeleton() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="space-y-3 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="mt-2 h-4 w-full max-w-lg" />
              </div>
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
