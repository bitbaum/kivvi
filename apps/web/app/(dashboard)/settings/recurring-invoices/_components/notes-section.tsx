"use client";

import { useTranslations } from "next-intl";
import { FormTextarea } from "@/components/ui/form-field";

interface Props {
  defaultNotes?: string | null;
}

export function NotesSection({ defaultNotes }: Props) {
  const t = useTranslations("settings");
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("recurring.notesSection")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("recurring.notesDesc")}
        </p>
      </div>
      <div className="p-6">
        <FormTextarea
          name="notes"
          rows={4}
          defaultValue={defaultNotes || ""}
          placeholder={t("recurring.notesPlaceholder")}
        />
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p>{t("recurring.variablesDesc")}</p>
          <ul className="ml-2 list-inside list-disc space-y-1">
            <li>
              {"<%period_start_date%>"} - {t("recurring.var.periodStart")}
            </li>
            <li>
              {"<%period_end_date%>"} - {t("recurring.var.periodEnd")}
            </li>
            <li>
              {"<%current_month%>"} - {t("recurring.var.currentMonth")}
            </li>
            <li>
              {"<%current_year%>"} - {t("recurring.var.currentYear")}
            </li>
            <li>
              {"<%current_quarter%>"} - {t("recurring.var.currentQuarter")}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
