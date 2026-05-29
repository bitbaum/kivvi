"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getChecklistTemplate } from "@kivvi/core/src/config/checklist-templates";

// Curated subset of categories shown in quick intake (ordered by frequency at revamp-it)
const QUICK_CATEGORY_IDS = [
  "laptop",
  "desktop",
  "monitor",
  "phone",
  "tablet",
  "printer",
  "keyboard",
  "bike",
  "clothing",
  "furniture",
  "book",
  "appliance",
  "other",
] as const;

// labelKey derived from SSOT (checklist-templates) — no duplication
export const QUICK_CATEGORIES = QUICK_CATEGORY_IDS.map((value) => ({
  value,
  labelKey: getChecklistTemplate(value).labelKey,
}));

interface StepDescriptionProps {
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  error: string | null;
  onNext: () => void;
}

export function StepDescription({
  description,
  setDescription,
  category,
  setCategory,
  error,
  onNext,
}: StepDescriptionProps) {
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{ti("quickDescribe")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ti("quickDescribeHint")}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {ti("description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={ti("quickDescriptionPlaceholder")}
            rows={3}
            className="w-full rounded-xl border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {ti("category")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`rounded-xl border px-3 py-3 text-sm font-medium text-left transition-colors min-h-[44px] ${
                  category === cat.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                {ti(cat.labelKey as Parameters<typeof ti>[0])}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 min-h-[56px]"
      >
        {tc("continue")}
        <ChevronRight className="h-5 w-5" />
      </button>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
