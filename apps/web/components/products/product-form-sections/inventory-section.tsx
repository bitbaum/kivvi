"use client";

import { useTranslations } from "next-intl";
import type { Product } from "@kivvi/database";
import { FormInput } from "@/components/ui/form-field";

interface SectionProps {
  product?: Product;
  isEdit: boolean;
}

export function ProductFormInventorySection({ product, isEdit }: SectionProps) {
  const t = useTranslations("products");

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("inventorySection")}</h2>
      </div>
      <div className="space-y-4 p-6">
        <div className="max-w-xs">
          <label
            htmlFor="minStock"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("minStock")}
          </label>
          <FormInput
            type="number"
            id="minStock"
            name="minStock"
            min={0}
            step={1}
            defaultValue={product?.minStock ?? ""}
            placeholder={!isEdit ? "0" : undefined}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="serialNumberTracking"
            name="serialNumberTracking"
            defaultChecked={product?.serialNumberTracking ?? false}
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
          />
          <label htmlFor="serialNumberTracking" className="text-sm font-medium">
            {t("serialNumberTracking")}
          </label>
        </div>
      </div>
    </div>
  );
}
