"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export function DataQualitySection({
  icon: Icon,
  title,
  count,
  children,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const tDQ = useTranslations("dataQuality");
  const [open, setOpen] = useState(defaultOpen || count > 0);
  const hasIssues = count > 0;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div
          className={`rounded-lg border p-2 ${hasIssues ? "border-warning/30 bg-warning/10" : "bg-background"}`}
        >
          <Icon
            className={`h-4 w-4 ${hasIssues ? "text-warning" : "text-muted-foreground"}`}
          />
        </div>
        <div className="flex-1">
          <span className="font-semibold">{title}</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            hasIssues
              ? "bg-warning/15 text-warning"
              : "bg-success/15 text-success"
          }`}
        >
          {hasIssues
            ? tDQ("sectionBadgeIssues", { count })
            : tDQ("sectionBadgeOk")}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && <div className="border-t p-5">{children}</div>}
    </div>
  );
}
