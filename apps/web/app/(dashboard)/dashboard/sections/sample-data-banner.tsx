"use client";

import { useState, useTransition } from "react";
import { FlaskConical, X } from "lucide-react";
import { clearSampleDataAction } from "@/app/actions/onboarding";

export function SampleDataBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;

  function handleClear() {
    startTransition(async () => {
      await clearSampleDataAction();
      setDismissed(true);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
      <FlaskConical className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1 text-amber-800 dark:text-amber-200">
        Du arbeitest mit <span className="font-medium">Beispieldaten</span> —
        diese Daten dienen nur zur Erkundung und können jederzeit gelöscht
        werden.
      </p>
      <button
        onClick={handleClear}
        disabled={isPending}
        className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-900/40"
      >
        {isPending ? "Wird gelöscht…" : "Beispieldaten löschen"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-amber-600 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40"
        aria-label="Schliessen"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
