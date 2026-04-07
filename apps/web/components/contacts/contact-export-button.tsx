"use client";

import { CsvExportButton } from "@/components/csv-export-button";
import { exportContactsCsvAction } from "@/app/actions/csv-export";

interface ContactExportButtonProps {
  totalCount: number;
  filters?: { search?: string; type?: string };
}

export function ContactExportButton({
  totalCount,
  filters,
}: ContactExportButtonProps) {
  return (
    <CsvExportButton
      onExport={() => exportContactsCsvAction(filters)}
      totalCount={totalCount}
      entityLabel="Kontakte"
    />
  );
}
