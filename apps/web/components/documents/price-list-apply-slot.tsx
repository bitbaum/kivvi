"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { resolvePricesAction } from "@/app/actions/pricing";
import type { PriceList } from "@kivvi/database";
import type { LineItem } from "./document-form-types";

interface Props {
  priceLists: PriceList[];
  items: LineItem[];
  onApply: (updates: Record<string, string>) => void;
}

export function PriceListApplySlot({ priceLists, items, onApply }: Props) {
  const t = useTranslations("documents");
  const [selectedId, setSelectedId] = useState("");
  const [applied, setApplied] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (priceLists.length === 0) return null;

  const itemsWithProduct = items.filter((i) => i.productId);

  function handleApply() {
    if (!selectedId || itemsWithProduct.length === 0) return;
    setApplied(false);

    startTransition(async () => {
      const result = await resolvePricesAction({
        priceListId: selectedId,
        items: itemsWithProduct.map((i) => ({
          productId: i.productId!,
          quantity: parseFloat(i.quantity) || 1,
        })),
      });
      if (result.success && result.data) {
        onApply(result.data);
        setApplied(true);
        setTimeout(() => setApplied(false), 2000);
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selectedId}
        onChange={(e) => {
          setSelectedId(e.target.value);
          setApplied(false);
        }}
        className="min-h-[44px] rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">{t("priceListSelectPlaceholder")}</option>
        {priceLists.map((pl) => (
          <option key={pl.id} value={pl.id}>
            {pl.name}
          </option>
        ))}
      </select>

      {selectedId && (
        <button
          type="button"
          onClick={handleApply}
          disabled={isPending || itemsWithProduct.length === 0}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
        >
          {applied ? (
            <>
              <Check className="h-3 w-3 text-success" />
              {t("priceListApplied")}
            </>
          ) : isPending ? (
            <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            t("priceListApply")
          )}
        </button>
      )}
    </div>
  );
}
