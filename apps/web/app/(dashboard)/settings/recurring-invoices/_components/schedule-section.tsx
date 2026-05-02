"use client";

import { useTranslations } from "next-intl";
import { FormInput, FormSelect } from "@/components/ui/form-field";

interface Props {
  defaultPeriodicity?: string;
  defaultStartDate?: string;
  defaultEndDate?: string | null;
  defaultAutoExtensionMonths?: number | null;
}

export function ScheduleSection({
  defaultPeriodicity,
  defaultStartDate,
  defaultEndDate,
  defaultAutoExtensionMonths,
}: Props) {
  const t = useTranslations("settings");
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("recurring.scheduleSection")}</h2>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="recurring-periodicity"
            className="mb-2 block text-sm font-medium"
          >
            {t("recurring.periodicity.label")}{" "}
            <span className="text-destructive">*</span>
          </label>
          <FormSelect
            id="recurring-periodicity"
            name="periodicity"
            required
            defaultValue={defaultPeriodicity || "monthly"}
          >
            <option value="monthly">
              {t("recurring.periodicity.monthly")}
            </option>
            <option value="quarterly">
              {t("recurring.periodicity.quarterly")}
            </option>
            <option value="annual">{t("recurring.periodicity.annual")}</option>
          </FormSelect>
        </div>

        <div>
          <label
            htmlFor="recurring-startDate"
            className="mb-2 block text-sm font-medium"
          >
            {t("recurring.startDate")}{" "}
            <span className="text-destructive">*</span>
          </label>
          <FormInput
            id="recurring-startDate"
            type="date"
            name="startDate"
            required
            defaultValue={defaultStartDate}
          />
        </div>

        <div>
          <label
            htmlFor="recurring-endDate"
            className="mb-2 block text-sm font-medium"
          >
            {t("recurring.endDate")}
          </label>
          <FormInput
            id="recurring-endDate"
            type="date"
            name="endDate"
            defaultValue={defaultEndDate || ""}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t("recurring.endDateDesc")}
          </p>
        </div>

        <div>
          <label
            htmlFor="recurring-autoExtensionMonths"
            className="mb-2 block text-sm font-medium"
          >
            {t("recurring.autoExtension")}
          </label>
          <FormInput
            id="recurring-autoExtensionMonths"
            type="number"
            name="autoExtensionMonths"
            min="1"
            max="60"
            defaultValue={defaultAutoExtensionMonths || ""}
            placeholder={t("recurring.autoExtensionPlaceholder")}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t("recurring.autoExtensionDesc")}
          </p>
        </div>
      </div>
    </section>
  );
}
