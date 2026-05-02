"use client";

import { useTranslations } from "next-intl";
import type { Product } from "@kivvi/database";

interface SectionProps {
  product?: Product;
  isEdit: boolean;
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
