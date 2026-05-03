"use client";

import Decimal from "decimal.js";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { addRepairPartAction } from "@/app/actions/inventory-items";
import { ProductSearchInput } from "@/components/documents/product-search-input";
import type { RepairPartWithProduct } from "@kivvi/core/src/domain/inventory-items";

interface Props {
  itemId: string;
  onAdded: (part: RepairPartWithProduct) => void;
  onClose: () => void;
}

export function RepairPartAddForm({ itemId, onAdded, onClose }: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addRepairPartAction(itemId, {
        description,
        productId: productId ?? undefined,
        quantity,
        unitCost,
        notes: notes || undefined,
      });
      if (!result.success || !result.data) {
        setError(result.error ?? tc("error"));
        return;
      }
      const optimistic: RepairPartWithProduct = {
        id: result.data.id,
        companyId: "",
        inventoryItemId: itemId,
        productId: null,
        description,
        quantity,
        unitCost,
        notes: notes || null,
        recordedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        product: null,
      };
      onAdded(optimistic);
      onClose();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="repair-part-description"
            className="mb-1 block text-sm font-medium"
          >
            {t("repairPartDescription")}
            <span className="ml-0.5 text-destructive">*</span>
          </label>
          <ProductSearchInput
            inputId="repair-part-description"
            value={description}
            onChange={(val) => {
              setDescription(val);
              if (productId) setProductId(null);
            }}
            onProductSelect={(product) => {
              setDescription(product.name);
              setProductId(product.productId ?? product.id ?? null);
              if (product.unitPrice && product.unitPrice !== "0") {
                setUnitCost(new Decimal(product.unitPrice).toFixed(2));
              }
            }}
            placeholder={t("repairPartDescriptionPlaceholder")}
          />
        </div>
        <div>
          <label
            htmlFor="repair-part-quantity"
            className="mb-1 block text-sm font-medium"
          >
            {t("repairPartQuantity")}
          </label>
          <input
            id="repair-part-quantity"
            type="number"
            step="0.0001"
            min="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="repair-part-unit-cost"
            className="mb-1 block text-sm font-medium"
          >
            {t("repairPartUnitCost")}
            <span className="ml-0.5 text-destructive">*</span>
          </label>
          <input
            id="repair-part-unit-cost"
            type="number"
            step="0.01"
            min="0"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            required
            placeholder="0.00"
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="repair-part-notes"
            className="mb-1 block text-sm font-medium"
          >
            {t("repairPartNotes")}
          </label>
          <input
            id="repair-part-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? tc("saving") : t("addRepairPart")}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          <X className="h-3 w-3" />
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}
