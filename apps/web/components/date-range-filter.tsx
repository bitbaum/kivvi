"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

interface DateRangeFilterProps {
  basePath: string;
  preserveParams?: string[];
  labelFrom: string;
  labelTo: string;
}

/**
 * Client-side date range filter that syncs with URL search params.
 * Updates dateFrom/dateTo in the URL, triggering server component re-render.
 */
export function DateRangeFilter({
  basePath,
  preserveParams = [],
  labelFrom,
  labelTo,
}: DateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  function updateUrl(from: string, to: string) {
    const params = new URLSearchParams();
    for (const key of preserveParams) {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    }
    if (from) params.set("dateFrom", from);
    if (to) params.set("dateTo", to);
    // Reset to page 1 when filtering
    const qs = params.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => updateUrl(e.target.value, dateTo)}
        aria-label={labelFrom}
        title={labelFrom}
        className="h-10 rounded-lg border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <span className="text-muted-foreground text-xs">–</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => updateUrl(dateFrom, e.target.value)}
        aria-label={labelTo}
        title={labelTo}
        className="h-10 rounded-lg border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {(dateFrom || dateTo) && (
        <button
          onClick={() => updateUrl("", "")}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
