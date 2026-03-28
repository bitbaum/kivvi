"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface BulkResult {
  successCount: number;
  failureCount: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

interface BulkResultBannerProps {
  result: BulkResult | null;
  labels: Record<string, string>;
  onDismiss: () => void;
}

export function BulkResultBanner({
  result,
  labels,
  onDismiss,
}: BulkResultBannerProps) {
  const tc = useTranslations("common");
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [result, onDismiss]);

  if (!result) return null;

  const isFullSuccess = result.failureCount === 0;
  const isFullFailure = result.successCount === 0;

  const bgClass = isFullSuccess
    ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300"
    : isFullFailure
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
      : "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300";

  const Icon = isFullSuccess
    ? CheckCircle
    : isFullFailure
      ? XCircle
      : AlertTriangle;
  const message = isFullSuccess
    ? labels.successAll.replace("{count}", String(result.successCount))
    : isFullFailure
      ? labels.failedAll.replace("{count}", String(result.failureCount))
      : labels.successPartial
          .replace("{successCount}", String(result.successCount))
          .replace("{failureCount}", String(result.failureCount));

  const errors = result.results.filter((r) => !r.success);

  return (
    <div role="alert" className={cn("rounded-lg border p-3", bgClass)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">{message}</span>
          {errors.length > 0 && (
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="inline-flex items-center gap-1 text-xs underline"
            >
              {showErrors ? labels.hideErrors : labels.showErrors}
              {showErrors ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label={tc("aria.dismiss")}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {showErrors && errors.length > 0 && (
        <ul className="mt-2 space-y-1 pl-6 text-xs">
          {errors.map((e) => (
            <li key={e.id}>
              {e.id.slice(0, 8)}...: {e.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
