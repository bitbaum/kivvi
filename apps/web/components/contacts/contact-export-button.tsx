"use client";

import { useTranslations } from "next-intl";
import { CsvExportButton } from "@/components/csv-export-button";
import { exportContactsCsvAction } from "@/app/actions/csv-export";

interface ContactExportButtonProps {
  totalCount: number;
  filters?: { search?: string; type?: string };
}

export function ContactExportButton({ totalCount, filters }: ContactExportButtonProps) {
  const t = useTranslations("common");
  return (
    <CsvExportButton
      onExport={() => exportContactsCsvAction(filters)}
      totalCount={totalCount}
      entityLabel={t("contacts")}
    />
  );
}
