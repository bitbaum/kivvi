"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { ITEM_CONDITION_CONFIG } from "@/lib/config/inventory-items";
import { QUICK_CATEGORIES } from "./step-description";
import { ContactPicker } from "@/components/contacts/contact-picker";

interface StepDonorProps {
  donorContactId: string | null;
  donorDisplayName: string;
  onDonorChange: (id: string | null, name: string) => void;
  description: string;
  category: string;
  condition: string;
  error: string | null;
  isPending: boolean;
  onSubmit: () => void;
}

export function StepDonor({
  donorContactId,
  donorDisplayName,
  onDonorChange,
  description,
  category,
  condition,
  error,
  isPending,
  onSubmit,
}: StepDonorProps) {
  const ti = useTranslations("inventory");
  // Category labels live under the "checklist" namespace (SSOT for
  // checklist-template labelKeys); condition labels live under "inventory".
  const tk = useTranslations("checklist");

  const categoryLabel = tk(
    (QUICK_CATEGORIES.find((c) => c.value === category)?.labelKey ?? "categoryOther") as Parameters<
      typeof tk
    >[0],
  );

  const conditionCfg = ITEM_CONDITION_CONFIG[condition];
  const conditionLabel = ti((conditionCfg?.labelKey ?? condition) as Parameters<typeof ti>[0]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{ti("quickDonor")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{ti("quickDonorHint")}</p>
      </div>

      <ContactPicker
        value={donorContactId}
        displayValue={donorDisplayName}
        onChange={(id, name) => onDonorChange(id, name)}
        contactType="customer"
        allowQuickCreate
        label={ti("donor")}
      />

      <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{ti("description")}</span>
          <span className="font-medium text-right max-w-[60%] truncate">{description}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{ti("category")}</span>
          <span className="font-medium">{categoryLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{ti("condition")}</span>
          <span className={`font-medium ${conditionCfg?.style ?? ""}`}>{conditionLabel}</span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <button
        onClick={onSubmit}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 min-h-[56px]"
      >
        {isPending ? (
          ti("quickSaving")
        ) : (
          <>
            <Check className="h-5 w-5" />
            {ti("quickSave")}
          </>
        )}
      </button>
    </div>
  );
}
