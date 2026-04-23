"use client";

import { useTranslations } from "next-intl";
import type { Product } from "@kivvi/database";
import { SWISS_VAT_RATES, DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { PRODUCT_TYPES, UNIT_VALUES } from "@/lib/config/products";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-field";

interface SectionProps {
  product?: Product;
  isEdit: boolean;
}

interface BasicSectionProps extends SectionProps {
  productType: string;
  onTypeChange: (type: "product" | "service") => void;
}

export function ProductFormBasicSection({
  product,
  isEdit,
  productType,
  onTypeChange,
}: BasicSectionProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  const typeOptions = PRODUCT_TYPES.map((pt) => ({ value: pt, label: t(pt) }));

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("basicInformation")}</h2>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
            {tc("type")} <span className="text-destructive">*</span>
          </label>
          <FormSelect
            id="type"
            name="type"
            required
            value={productType}
            onChange={(e) =>
              onTypeChange(e.target.value as "product" | "service")
            }
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FormSelect>
        </div>
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            {tc("name")} <span className="text-destructive">*</span>
          </label>
          <FormInput
            type="text"
            id="name"
            name="name"
            required
            maxLength={255}
            defaultValue={product?.name || ""}
            placeholder={!isEdit ? tc("name") : undefined}
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="mb-1.5 block text-sm font-medium"
          >
            {tc("description")}
          </label>
          <FormTextarea
            id="description"
            name="description"
            rows={3}
            maxLength={5000}
            defaultValue={product?.description || ""}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sku" className="mb-1.5 block text-sm font-medium">
              {t("sku")}
            </label>
            <FormInput
              type="text"
              id="sku"
              name="sku"
              maxLength={100}
              defaultValue={product?.sku || ""}
              placeholder={
                !isEdit ? t("placeholders.articleNumber") : undefined
              }
            />
          </div>
          <div>
            <label htmlFor="ean" className="mb-1.5 block text-sm font-medium">
              {t("ean")}
            </label>
            <FormInput
              type="text"
              id="ean"
              name="ean"
              maxLength={50}
              defaultValue={product?.ean || ""}
              placeholder={!isEdit ? t("placeholders.ean") : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
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

        {/* Flexible pricing (Richtpreis) */}
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
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
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
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
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
              defaultValue={product?.unit || "piece"}
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
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <label htmlFor="serialNumberTracking" className="text-sm font-medium">
            {t("serialNumberTracking")}
          </label>
        </div>
      </div>
    </div>
  );
}

export function ProductFormVisibilitySection({ product }: SectionProps) {
  const t = useTranslations("products");

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("visibility")}</h2>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="shopVisible"
            name="shopVisible"
            defaultChecked={product?.shopVisible ?? false}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <div>
            <label htmlFor="shopVisible" className="text-sm font-medium">
              {t("visibleInShop")}
            </label>
            <p className="text-xs text-muted-foreground">
              {t("shopVisibleDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
