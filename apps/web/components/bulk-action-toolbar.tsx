"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface BulkActionToolbarProps {
  count: number;
  selectedLabel: string;
  clearLabel: string;
  onClear: () => void;
  children: ReactNode;
}

export function BulkActionToolbar({
  count,
  selectedLabel,
  clearLabel,
  onClear,
  children,
}: BulkActionToolbarProps) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-4 z-10 mx-auto flex w-fit items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-lg">
      <span className="text-sm font-medium">
        {count} {selectedLabel}
      </span>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">{children}</div>
      <div className="h-4 w-px bg-border" />
      <button
        onClick={onClear}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
      >
        <X className="h-3.5 w-3.5" />
        {clearLabel}
      </button>
    </div>
  );
}
