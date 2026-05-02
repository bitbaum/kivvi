"use client";

import { useTranslations } from "next-intl";
import type { Product } from "@kivvi/database";
import { SWISS_VAT_RATES, DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { UNIT_VALUES, DEFAULT_UNIT } from "@/lib/config/products";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import { FormInput, FormSelect } from "@/components/ui/form-field";

interface SectionProps {
  product?: Product;
  isEdit: boolean;
}

export function ProductFormPricingSection({ product, isEdit }: SectionProps) {
  const t = useTranslations("products");

  const vatRateOptions = SWISS_VAT_RATES.map((rate) => ({
    value: rate.value,
    label: t(`vatRates.${rate.labelKey}`),
  }));
  const unitOptions = UNIT_VALUES.map((u) => ({
    value: u,
    label: t(`units.${u}`),
  }));
  const currency = product?.currency || DEFAULT_CURRENCY;

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("pricing")}</h2>
      </div>
      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="unitPrice"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("unitPrice")} ({currency}){" "}
              <span className="text-destructive">*</span>
            </label>
            <FormInput
              type="text"
              id="unitPrice"
              name="unitPrice"
              required
              defaultValue={product?.unitPrice || ""}
              placeholder={!isEdit ? "0.00" : undefined}
              pattern={!isEdit ? "\\d+(\\.\\d{1,2})?" : undefined}
            />
          </div>
          <div>
            <label
              htmlFor="purchasePrice"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("purchasePrice")} ({currency})
            </label>
            <FormInput
              type="text"
              id="purchasePrice"
              name="purchasePrice"
              defaultValue={product?.purchasePrice || ""}
              placeholder={!isEdit ? "0.00" : undefined}
              pattern={!isEdit ? "\\d+(\\.\\d{1,2})?" : undefined}
            />
          </div>
        </div>

        <input type="hidden" name="currency" value={currency} />

        <div className="rounded-lg border p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="isPriceFlexible"
              value="true"
              defaultChecked={product?.isPriceFlexible || false}
              className="h-4 w-4 rounded border-input"
            />
            {t("flexiblePricing")}
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("flexiblePricingDesc")}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="minPrice"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                {t("minPrice")}
              </label>
              <FormInput
                type="text"
                id="minPrice"
                name="minPrice"
                defaultValue={product?.minPrice || ""}
                placeholder="0.00"
                pattern="\d+(\.\d{1,2})?"
              />
            </div>
            <div>
              <label
                htmlFor="maxPrice"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                {t("maxPrice")}
              </label>
              <FormInput
                type="text"
                id="maxPrice"
                name="maxPrice"
                defaultValue={product?.maxPrice || ""}
                placeholder="0.00"
                pattern="\d+(\.\d{1,2})?"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="vatRate"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("vatRate")} <span className="text-destructive">*</span>
            </label>
            <FormSelect
              id="vatRate"
              name="vatRate"
              required
              defaultValue={product?.vatRate || DEFAULT_VAT_RATE}
            >
              {vatRateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FormSelect>
          </div>
          <div>
            <label htmlFor="unit" className="mb-1.5 block text-sm font-medium">
              {t("unit")}
            </label>
            <FormSelect
              id="unit"
              name="unit"
              defaultValue={product?.unit || DEFAULT_UNIT}
            >
              {unitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>
      </div>
    </div>
  );
}
