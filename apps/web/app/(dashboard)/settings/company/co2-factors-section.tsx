"use client";

import { useState, useTransition } from "react";
import { Leaf, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateCo2FactorsAction } from "@/app/actions/settings";
import { CO2_FACTORS_KG } from "@kivvi/core/src/config/co2-factors";
import { getChecklistTemplate } from "@kivvi/core/src/config/checklist-templates";

interface Co2FactorsSectionProps {
  /** Company-specific overrides from settings.co2FactorsKg */
  initialFactors: Record<string, number> | undefined;
}

export function Co2FactorsSection({ initialFactors }: Co2FactorsSectionProps) {
  const t = useTranslations("settings.company");
  const tc = useTranslations("common");
  const tck = useTranslations("checklist");
  const [isPending, startTransition] = useTransition();

  // Merged state: defaults overlaid with company overrides
  const [factors, setFactors] = useState<Record<string, number>>(() => {
    const merged: Record<string, number> = { ...CO2_FACTORS_KG };
    if (initialFactors) {
      for (const [k, v] of Object.entries(initialFactors)) {
        if (typeof v === "number" && v >= 0) merged[k] = v;
      }
    }
    return merged;
  });

  function handleChange(category: string, raw: string) {
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 0) {
      setFactors((prev) => ({ ...prev, [category]: num }));
    }
  }

  function handleReset() {
    setFactors({ ...CO2_FACTORS_KG });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateCo2FactorsAction(factors);
      if (result.success) {
        toast.success(t("co2FactorsSaved"));
      } else {
        toast.error(result.error ?? tc("error"));
      }
    });
  }

  const categories = Object.keys(CO2_FACTORS_KG);

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="h-4 w-4 text-success" />
            <h2 className="font-semibold">{t("co2Factors")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{t("co2FactorsDesc")}</p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          {t("co2FactorsReset")}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const defaultKg = CO2_FACTORS_KG[cat];
          const current = factors[cat] ?? defaultKg;
          const isCustom = current !== defaultKg;
          return (
            <div key={cat} className="space-y-1">
              <label className="block text-xs font-medium">
                {tck(
                  getChecklistTemplate(cat).labelKey as Parameters<
                    typeof tck
                  >[0],
                )}
                {isCustom && (
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                    ({t("co2FactorsDefault", { kg: defaultKg })})
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={current}
                  onChange={(e) => handleChange(cat, e.target.value)}
                  className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-ring ${
                    isCustom ? "border-warning/50 bg-warning/5" : ""
                  }`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                  kg
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? tc("saving") : tc("save")}
        </button>
      </div>
    </div>
  );
}
