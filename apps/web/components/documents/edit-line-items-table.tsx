"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import { SWISS_VAT_RATES } from "@/lib/config/vat-rates";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { calculateItemTotal } from "./calculate-item-total";
import type { LineItem } from "./document-form-types";

interface EditLineItemsTableProps {
  items: LineItem[];
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (
    id: string,
    field: keyof LineItem,
    value: string | null,
  ) => void;
}

export function EditLineItemsTable({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: EditLineItemsTableProps) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold">{t("lineItems")}</h2>
        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus className="h-4 w-4" /> {t("addItem")}
        </button>
      </div>
      <div className="divide-y">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-2.5 w-6 text-sm text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex-1 space-y-3">
                <FormInput
                  type="text"
                  value={item.description}
                  onChange={(e) =>
                    onUpdateItem(item.id, "description", e.target.value)
                  }
                  placeholder={tc("description")}
                />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div>
                    <label
                      htmlFor={`edit-quantity-${item.id}`}
                      className="block text-sm text-muted-foreground"
                    >
                      {t("quantity")}
                    </label>
                    <FormInput
                      id={`edit-quantity-${item.id}`}
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateItem(item.id, "quantity", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-unitPrice-${item.id}`}
                      className="block text-sm text-muted-foreground"
                    >
                      {t("unitPrice")}
                    </label>
                    <FormInput
                      id={`edit-unitPrice-${item.id}`}
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        onUpdateItem(item.id, "unitPrice", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-discount-${item.id}`}
                      className="block text-sm text-muted-foreground"
                    >
                      {t("discount")} %
                    </label>
                    <FormInput
                      id={`edit-discount-${item.id}`}
                      type="number"
                      step="0.1"
                      value={item.discount}
                      onChange={(e) =>
                        onUpdateItem(item.id, "discount", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-vatRate-${item.id}`}
                      className="block text-sm text-muted-foreground"
                    >
                      {t("vatPercent")}
                    </label>
                    <FormSelect
                      id={`edit-vatRate-${item.id}`}
                      value={item.vatRate}
                      onChange={(e) =>
                        onUpdateItem(item.id, "vatRate", e.target.value)
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
                    <p className="mt-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm font-medium">
                      {formatCurrency(calculateItemTotal(item).toFixed(2))}
                    </p>
                  </div>
                </div>
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label={tc("remove")}
                  className="mt-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/5 hover:text-destructive dark:hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
