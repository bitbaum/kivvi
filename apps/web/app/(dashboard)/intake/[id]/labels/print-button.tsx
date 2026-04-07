"use client";

import { Printer } from "lucide-react";

export function PrintLabelsButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      <Printer className="h-4 w-4" />
      Print
    </button>
  );
}
