"use client";

import { Check, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ITEM_CONDITION_CONFIG } from "@/lib/config/inventory-items";
import { ITEM_CONDITION_VALUES } from "@kivvi/database/src/enums";

interface StepConditionProps {
  condition: string;
  setCondition: (v: string) => void;
  onNext: () => void;
}

export function StepCondition({
  condition,
  setCondition,
  onNext,
}: StepConditionProps) {
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{ti("quickCondition")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ti("quickConditionHint")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {ITEM_CONDITION_VALUES.map((c) => {
          const cfg = ITEM_CONDITION_CONFIG[c];
          const isSelected = condition === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCondition(c)}
              className={`flex items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-colors min-h-[56px] ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-muted-foreground/20 hover:bg-muted"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${cfg?.style ?? ""}`}
              >
                {cfg?.shortLabel ?? c}
              </span>
              <span className="text-base font-medium">
                {ti((cfg?.labelKey as Parameters<typeof ti>[0]) ?? c)}
              </span>
              {isSelected && (
                <Check className="ml-auto h-5 w-5 text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 min-h-[56px]"
      >
        {tc("continue")}
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
