"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SWISS_VAT_RATES } from "@/lib/config/vat-rates";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { ProductSearchInput } from "./product-search-input";
import type { LineItem } from "./document-form-types";
import { calculateItemTotal } from "./calculate-item-total";
import { formatCurrency } from "@/lib/utils";

interface SortableLineItemProps {
  item: LineItem;
  index: number;
  updateItem: (id: string, field: keyof LineItem, value: string | null) => void;
  removeItem: (id: string) => void;
  canRemove: boolean;
  /** Hide price/discount/VAT/total columns (for donation intakes) */
  hideFinancials?: boolean;
  /** Override label for the price column (e.g. "Acquisition Cost" for purchase intakes) */
  priceLabel?: string;
  t: (key: string) => string;
  tc: (key: string) => string;
}

export function SortableLineItem({
  item,
  index,
  updateItem,
  removeItem,
  canRemove,
  hideFinancials,
  priceLabel,
  t,
  tc,
}: SortableLineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 space-y-3 border-b last:border-b-0"
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-2.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
          aria-label={tc("aria.dragToReorder")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <span className="mt-2.5 text-sm text-muted-foreground w-6">
          {index + 1}
        </span>

        <div className="flex-1 space-y-3">
          <ProductSearchInput
            value={item.description}
            onChange={(val) => updateItem(item.id, "description", val)}
            onProductSelect={(product) => {
              updateItem(item.id, "productId", product.productId || product.id);
              updateItem(
                item.id,
                "inventoryItemId",
                product.inventoryItemId || null,
              );
              updateItem(item.id, "description", product.name);
              updateItem(item.id, "stockQuantity", product.stockQuantity);
              updateItem(item.id, "minPrice", product.minPrice ?? null);
              updateItem(item.id, "maxPrice", product.maxPrice ?? null);
              if (product.unitPrice)
                updateItem(item.id, "unitPrice", product.unitPrice);
              if (product.vatRate)
                updateItem(item.id, "vatRate", product.vatRate);
              if (!item.quantity || item.quantity === "0")
                updateItem(item.id, "quantity", "1");
            }}
            placeholder={tc("description")}
            data-item-id={item.id}
            data-field="description"
          />
          <div
            className={`grid grid-cols-2 gap-3 ${hideFinancials ? "sm:grid-cols-1" : "sm:grid-cols-5"}`}
          >
            <div>
              <label className="block text-sm text-muted-foreground">
                {t("quantity")}
              </label>
              <FormInput
                type="number"
                step="0.01"
                value={item.quantity}
                onChange={(e) =>
                  updateItem(item.id, "quantity", e.target.value)
                }
                className="mt-1"
              />
              {item.stockQuantity !== null &&
                (() => {
                  const qty = parseFloat(item.quantity || "0");
                  const stock = parseFloat(item.stockQuantity || "0");
                  if (stock <= 0)
                    return (
                      <p role="alert" className="mt-1 text-xs text-destructive">
                        {t("outOfStock")}
                      </p>
                    );
                  if (qty > stock)
                    return (
                      <p role="alert" className="mt-1 text-xs text-warning">
                        {t("inStock").replace(
                          "{count}",
                          String(Math.floor(stock)),
                        )}
                      </p>
                    );
                  return null;
                })()}
            </div>
            {!hideFinancials && (
              <>
                <div>
                  <label className="block text-sm text-muted-foreground">
                    {priceLabel || t("unitPrice")}
                  </label>
                  <FormInput
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(item.id, "unitPrice", e.target.value)
                    }
                    className="mt-1"
                  />
                  {item.minPrice && item.maxPrice && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("flexPriceHint")}: {formatCurrency(item.minPrice)} –{" "}
                      {formatCurrency(item.maxPrice)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground">
                    {t("discount")} %
                  </label>
                  <FormInput
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={item.discount}
                    onChange={(e) =>
                      updateItem(item.id, "discount", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground">
                    {t("vatRate")} %
                  </label>
                  <FormSelect
                    value={item.vatRate}
                    onChange={(e) =>
                      updateItem(item.id, "vatRate", e.target.value)
                    }
                    className="mt-1"
                  >
                    {SWISS_VAT_RATES.map((rate) => (
                      <option key={rate.value} value={rate.value}>
                        {rate.value}%
                      </option>
                    ))}
                  </FormSelect>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground">
                    {tc("total")}
                  </label>
                  <div className="mt-1 rounded-lg border bg-muted px-3 py-2 text-sm font-medium">
                    {calculateItemTotal(item).toFixed(2)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            aria-label={tc("aria.removeLineItem")}
            className="mt-2 flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] text-muted-foreground hover:bg-destructive/5 hover:text-destructive dark:hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
