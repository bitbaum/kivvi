import { Skeleton } from '@/components/ui/skeleton';

/**
 * Generic loading skeleton for form pages (new/edit pages).
 * Renders a back link, header, and form card sections.
 */
export function FormPageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-32" />

      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Form section 1 */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3.5 w-20 mb-1.5" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form section 2 */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3.5 w-24 mb-1.5" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit buttons */}
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}
