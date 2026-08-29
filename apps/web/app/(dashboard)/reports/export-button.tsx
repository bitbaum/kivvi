"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportReportAction, type ExportReportParams } from "@/app/actions/reports";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface ExportButtonProps {
  reportType: ExportReportParams["reportType"];
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
  disabled?: boolean;
}

export function ExportButton({
  reportType,
  startDate,
  endDate,
  asOfDate,
  disabled,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const tc = useTranslations("common");

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const result = await exportReportAction({
        reportType,
        format: "csv",
        startDate,
        endDate,
        asOfDate,
      });

      if (!result.success || !result.data) {
        logger.warn("Export failed", result.error);
        toast.error(result.error || tc("error"));
        return;
      }

      toast.success(tc("exported"));

      // Create blob and download
      const blob = new Blob([result.data.csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Export error", error);
      toast.error(tc("error"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      type="button"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {tc("exporting")}
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          {tc("export")} CSV
        </>
      )}
    </button>
  );
}
