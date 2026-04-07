"use client";

import { CsvExportButton } from "@/components/csv-export-button";
import { exportProductsCsvAction } from "@/app/actions/csv-export";

interface ProductExportButtonProps {
  totalCount: number;
  filters?: { search?: string };
}

export function ProductExportButton({
  totalCount,
  filters,
}: ProductExportButtonProps) {
  return (
    <CsvExportButton
      onExport={() => exportProductsCsvAction(filters)}
      totalCount={totalCount}
      entityLabel="Produkte"
    />
  );
}
