"use client";

import { CsvExportButton } from "@/components/csv-export-button";
import { exportInventoryItemsCsvAction } from "@/app/actions/csv-export";

interface InventoryItemsExportButtonProps {
  totalCount: number;
  filters?: {
    status?: string;
    condition?: string;
    search?: string;
    assignedToUserId?: string;
  };
}

export function InventoryItemsExportButton({
  totalCount,
  filters,
}: InventoryItemsExportButtonProps) {
  return (
    <CsvExportButton
      onExport={() => exportInventoryItemsCsvAction(filters)}
      totalCount={totalCount}
      entityLabel="Artikel"
    />
  );
}
