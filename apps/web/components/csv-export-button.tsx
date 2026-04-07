"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";

interface CsvExportButtonProps {
  /** Server action that returns { csvData, filename, rowCount } */
  onExport: () => Promise<{
    success: boolean;
    data?: { csvData: string; filename: string; rowCount: number };
    error?: string;
  }>;
  /** Number of items that will be exported (shown in button) */
  totalCount: number;
  /** Entity label for display, e.g. "Kontakte" */
  entityLabel: string;
}

export function CsvExportButton({
  onExport,
  totalCount,
  entityLabel,
}: CsvExportButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await onExport();
      if (result.success && result.data) {
        const blob = new Blob([result.data.csvData], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        setError(result.error || "Export failed");
      }
    });
  }

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isPending || totalCount === 0}
        className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
        title={
          totalCount > 0
            ? `Export ${totalCount} ${entityLabel}`
            : `No ${entityLabel} to export`
        }
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        CSV
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </>
  );
}
