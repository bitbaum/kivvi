"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createStockMovementAction } from "@/app/actions/inventory";
import { MOVEMENT_TYPES } from "@/lib/config/inventory";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { Button } from "@/components/ui/button";
import { MovementProductPicker } from "./product-picker";
import type { Product } from "./product-picker";

interface Warehouse {
  id: string;
  name: string;
}

/**
 * Single shared component for "record a stock movement" — used in two places:
 *   - /inventory/movements (no fixed warehouse → renders the warehouse picker)
 *   - /inventory/[warehouseId] (warehouse fixed by route → no picker)
 *
 * Pass `warehouseId` to lock the form to that warehouse. Pass `warehouses`
 * (and omit warehouseId) to let the user choose. Exactly one of the two must
 * be provided.
 */
export type MovementFormProps = {
  products: Product[];
} & (
  | { warehouseId: string; warehouses?: never }
  | { warehouseId?: never; warehouses: Warehouse[] }
);

export function MovementForm(props: MovementFormProps) {
  const fixedWarehouseId = props.warehouseId;
  const warehouses = props.warehouseId ? null : props.warehouses;
  const { products } = props;
  const router = useRouter();
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen, handleClose);

  const movementTypeOptions = MOVEMENT_TYPES.map((mt) => ({
    value: mt,
    label: t(mt),
  }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedProduct) {
      setError(t("selectProductRequired"));
      return;
    }

    const formData = new FormData(e.currentTarget);
    const warehouseId =
      fixedWarehouseId ?? (formData.get("warehouseId") as string);

    const input = {
      productId: selectedProduct.id,
      warehouseId,
      type: formData.get("type") as string,
      quantity: formData.get("quantity") as string,
      reference: (formData.get("reference") as string) || undefined,
    };

    if (!input.warehouseId || !input.type || !input.quantity) {
      setError(t("allFieldsRequired"));
      return;
    }

    startTransition(async () => {
      const result = await createStockMovementAction(input);
      if (result.success) {
        setIsOpen(false);
        setSelectedProduct(null);
        router.refresh();
      } else {
        setError(result.error || tc("error"));
      }
    });
  }

  function handleClose() {
    setIsOpen(false);
    setError(null);
    setSelectedProduct(null);
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("recordMovement")}
      </Button>
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-form-title"
        className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="movement-form-title" className="text-lg font-semibold">
            {t("recordMovement")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label={tc("close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <MovementProductPicker
            products={products}
            selectedProduct={selectedProduct}
            onSelect={setSelectedProduct}
          />

          {warehouses && (
            <div>
              <label
                htmlFor="movement-warehouse"
                className="mb-1 block text-sm font-medium"
              >
                {t("warehouses")} <span className="text-destructive">*</span>
              </label>
              <FormSelect id="movement-warehouse" name="warehouseId" required>
                <option value="">{tc("pleaseSelect")}</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </FormSelect>
            </div>
          )}

          <div>
            <label
              htmlFor="movement-type"
              className="mb-1 block text-sm font-medium"
            >
              {t("movementType")} <span className="text-destructive">*</span>
            </label>
            <FormSelect id="movement-type" name="type" required>
              <option value="">{tc("pleaseSelect")}</option>
              {movementTypeOptions.map((mt) => (
                <option key={mt.value} value={mt.value}>
                  {mt.label}
                </option>
              ))}
            </FormSelect>
          </div>

          <div>
            <label
              htmlFor="movement-quantity"
              className="mb-1 block text-sm font-medium"
            >
              {t("quantity")} <span className="text-destructive">*</span>
            </label>
            <FormInput
              id="movement-quantity"
              name="quantity"
              type="number"
              required
              min="0.01"
              step="0.01"
              placeholder={t("placeholders.quantity")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("quantityHelp")}
            </p>
          </div>

          <div>
            <label
              htmlFor="movement-reference"
              className="mb-1 block text-sm font-medium"
            >
              {t("reference")}
            </label>
            <FormInput
              id="movement-reference"
              name="reference"
              type="text"
              placeholder={t("placeholders.movementReference")}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? tc("saving") : t("recordMovement")}
            </Button>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
