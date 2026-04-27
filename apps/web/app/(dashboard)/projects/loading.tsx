import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-36" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Filters: search + status tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-10 w-full flex-1 rounded-lg" />
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-md" />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3">
                  <Skeleton className="h-3 w-12" />
                </th>
                <th className="px-4 py-3">
                  <Skeleton className="h-3 w-12" />
                </th>
                <th className="px-4 py-3">
                  <Skeleton className="h-3 w-12" />
                </th>
                <th className="px-4 py-3 text-right">
                  <Skeleton className="ml-auto h-3 w-14" />
                </th>
                <th className="px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
                <th className="px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...Array(8)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-36" />
                    {i % 3 === 0 && <Skeleton className="mt-1 h-3 w-48" />}
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Skeleton className="ml-auto h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <Skeleton className="h-4 w-44" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
