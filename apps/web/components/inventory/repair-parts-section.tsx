"use client";

import Decimal from "decimal.js";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Wrench, Plus, Trash2, X } from "lucide-react";
import { CardSection } from "@/components/card-section";
import {
  addRepairPartAction,
  removeRepairPartAction,
} from "@/app/actions/inventory-items";
import { formatCurrency } from "@/lib/utils";
import { ProductSearchInput } from "@/components/documents/product-search-input";
import type { RepairPartWithProduct } from "@kivvi/core/src/domain/inventory-items";

interface RepairPartsSectionProps {
  itemId: string;
  initialParts: RepairPartWithProduct[];
}

export function RepairPartsSection({
  itemId,
  initialParts,
}: RepairPartsSectionProps) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [parts, setParts] = useState<RepairPartWithProduct[]>(initialParts);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");

  const partsTotal = parts.reduce((sum, p) => {
    try {
      return sum.plus(new Decimal(p.quantity).times(new Decimal(p.unitCost)));
    } catch {
      return sum;
    }
  }, new Decimal(0));

  function resetForm() {
    setDescription("");
    setProductId(null);
    setQuantity("1");
    setUnitCost("");
    setNotes("");
    setError(null);
    setShowForm(false);
  }

  function handleAdd(e: React.FormEvent) {
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
      if (!result.success) {
        setError(result.error ?? tc("error"));
        return;
      }
      // Optimistic update: re-fetch by reloading via router.refresh() equivalent
      // Since we revalidatePath server-side, Next.js will refresh the server data.
      // For instant feedback we add a placeholder that matches the shape.
      const optimistic: RepairPartWithProduct = {
        id: result.data!.id,
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
      setParts((prev) => [optimistic, ...prev]);
      resetForm();
    });
  }

  function handleRemove(partId: string) {
    startTransition(async () => {
      const result = await removeRepairPartAction(partId, itemId);
      if (!result.success) {
        setError(result.error ?? tc("error"));
        return;
      }
      setParts((prev) => prev.filter((p) => p.id !== partId));
    });
  }

  return (
    <CardSection
      title={t("repairParts")}
      icon={<Wrench className="h-4 w-4" />}
      actions={
        !showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addRepairPart")}
          </button>
        ) : undefined
      }
    >
      {/* Add part form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-4 rounded-lg border bg-muted/30 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="repair-part-description"
                className="mb-1 block text-sm font-medium"
              >
                {t("repairPartDescription")}
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <ProductSearchInput
                inputId="repair-part-description"
                value={description}
                onChange={(val) => {
                  setDescription(val);
                  // Clear product link if user edits freely
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
                <span className="text-destructive ml-0.5">*</span>
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
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <X className="h-3 w-3" />
              {tc("cancel")}
            </button>
          </div>
        </form>
      )}

      {/* Parts list */}
      {parts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("repairPartsEmpty")}</p>
      ) : (
        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 text-xs font-medium text-muted-foreground">
            <span>{t("repairPartDescription")}</span>
            <span className="text-right">{t("repairPartQuantity")}</span>
            <span className="text-right">{t("repairPartUnitCost")}</span>
            <span className="text-right">{t("repairPartTotal")}</span>
          </div>
          {parts.map((part) => {
            let lineTotal = "—";
            try {
              lineTotal = formatCurrency(
                new Decimal(part.quantity)
                  .times(new Decimal(part.unitCost))
                  .toFixed(2),
              );
            } catch {
              // malformed decimals
            }
            return (
              <div
                key={part.id}
                className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <div>
                  <span className="font-medium">{part.description}</span>
                  {part.product && part.product.articleNumber && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({part.product.articleNumber})
                    </span>
                  )}
                  {part.notes && (
                    <p className="text-xs text-muted-foreground">
                      {part.notes}
                    </p>
                  )}
                </div>
                <span className="text-right tabular-nums">
                  {new Decimal(part.quantity).toFixed(2).replace(/\.?0+$/, "")}×
                </span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {formatCurrency(part.unitCost)}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-right tabular-nums font-medium">
                    {lineTotal}
                  </span>
                  <button
                    onClick={() => handleRemove(part.id)}
                    disabled={isPending}
                    className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-destructive transition-all"
                    title={tc("delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {/* Total row */}
          <div className="flex justify-between border-t pt-2 px-2 text-sm font-medium">
            <span>{t("repairPartsTotal")}</span>
            <span className="tabular-nums">
              {formatCurrency(partsTotal.toFixed(2))}
            </span>
          </div>
        </div>
      )}
    </CardSection>
  );
}
