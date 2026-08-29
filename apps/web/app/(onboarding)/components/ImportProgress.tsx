"use client";

import { Check, AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export interface ImportStatus {
  entityType: string;
  label: string;
  state: "pending" | "importing" | "done" | "error";
  inserted?: number;
  skipped?: number;
  errors?: string[];
}

interface ImportProgressProps {
  statuses: ImportStatus[];
}

export function ImportProgress({ statuses }: ImportProgressProps) {
  const t = useTranslations("onboarding");
  return (
    <div className="space-y-3">
      {statuses.map((status) => (
        <div key={status.entityType} className="flex items-center gap-3 rounded-lg border p-3">
          {/* Icon */}
          {status.state === "pending" && (
            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
          )}
          {status.state === "importing" && (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          {status.state === "done" && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10">
              <Check className="h-3 w-3 text-success" />
            </div>
          )}
          {status.state === "error" && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-3 w-3 text-destructive" />
            </div>
          )}

          {/* Label */}
          <span className="flex-1 text-sm font-medium">{status.label}</span>

          {/* Counts */}
          {status.state === "done" && (
            <span className="text-xs text-muted-foreground">
              {t("imported", { count: status.inserted ?? 0 })}
              {status.skipped ? `, ${t("skipped", { count: status.skipped })}` : ""}
            </span>
          )}
          {status.state === "error" && status.errors?.[0] && (
            <span role="alert" className="max-w-[200px] truncate text-sm text-destructive">
              {status.errors[0]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
