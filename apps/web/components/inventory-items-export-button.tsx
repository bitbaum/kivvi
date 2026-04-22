"use client";

import { useTranslations } from "next-intl";
import { CsvExportButton } from "@/components/csv-export-button";
import { exportInventoryItemsCsvAction } from "@/app/actions/csv-export";

interface InventoryItemsExportButtonProps {
  totalCount: number;
  filters?: {
    status?: string;
    condition?: string;
    search?: string;
    assignedToUserId?: string;
    warehouseId?: string;
  };
}

export function InventoryItemsExportButton({
  totalCount,
  filters,
}: InventoryItemsExportButtonProps) {
  const t = useTranslations("common");
  return (
    <CsvExportButton
      onExport={() => exportInventoryItemsCsvAction(filters)}
      totalCount={totalCount}
      entityLabel={t("items")}
    />
  );
}
