"use client";

import { useTranslations } from "next-intl";
import type { Product } from "@kivvi/database";
import { PRODUCT_TYPES } from "@/lib/config/products";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";

interface BasicSectionProps {
  product?: Product;
  isEdit: boolean;
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
            onChange={(e) => onTypeChange(e.target.value as "product" | "service")}
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
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
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
              placeholder={!isEdit ? t("placeholders.articleNumber") : undefined}
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
