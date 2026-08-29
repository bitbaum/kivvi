"use client";

import { useTranslations } from "next-intl";
import { CsvExportButton } from "@/components/csv-export-button";
import { exportProductsCsvAction } from "@/app/actions/csv-export";

interface ProductExportButtonProps {
  totalCount: number;
  filters?: { search?: string };
}

export function ProductExportButton({ totalCount, filters }: ProductExportButtonProps) {
  const t = useTranslations("common");
  return (
    <CsvExportButton
      onExport={() => exportProductsCsvAction(filters)}
      totalCount={totalCount}
      entityLabel={t("products")}
    />
  );
}
