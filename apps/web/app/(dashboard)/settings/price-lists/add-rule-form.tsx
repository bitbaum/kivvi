"use client";

import { useTransition, useRef } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPriceRuleAction } from "@/app/actions/pricing";

interface Props {
  priceListId: string;
}

export function AddRuleForm({ priceListId }: Props) {
  const t = useTranslations("priceLists");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    const input = {
      type: formData.get("type") as "fixed" | "percentage" | "tiered",
      value: formData.get("value") as string,
      productId: (formData.get("productId") as string) || null,
      minQuantity: (formData.get("minQuantity") as string) || null,
      validFrom: (formData.get("validFrom") as string) || null,
      validTo: (formData.get("validTo") as string) || null,
    };

    startTransition(async () => {
      const result = await createPriceRuleAction({ priceListId, input });
      if (result.success) {
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {t("ruleType")}
          </label>
          <select
            name="type"
            required
            className="block w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="fixed">{t("ruleTypeFixed")}</option>
            <option value="percentage">{t("ruleTypePercentage")}</option>
            <option value="tiered">{t("ruleTypeTiered")}</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {t("ruleValue")}
          </label>
          <input
            name="value"
            type="text"
            inputMode="decimal"
            pattern="^\d+(\.\d{1,2})?$"
            placeholder="0.00"
            required
            className="block w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {t("ruleMinQty")}
          </label>
          <input
            name="minQuantity"
            type="text"
            inputMode="decimal"
            placeholder="—"
            className="block w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {t("ruleValidFrom")}
          </label>
          <input
            name="validFrom"
            type="date"
            className="block w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {isPending ? tc("saving") : tc("create")}
        </button>
      </div>
    </form>
  );
}
