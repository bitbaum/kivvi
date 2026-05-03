"use client";

import Decimal from "decimal.js";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Wrench, Plus } from "lucide-react";
import { CardSection } from "@/components/card-section";
import { removeRepairPartAction } from "@/app/actions/inventory-items";
import type { RepairPartWithProduct } from "@kivvi/core/src/domain/inventory-items";
import { RepairPartAddForm } from "./repair-part-add-form";
import { RepairPartsList } from "./repair-parts-list";

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

  const partsTotal = parts.reduce((sum, p) => {
    try {
      return sum.plus(new Decimal(p.quantity).times(new Decimal(p.unitCost)));
    } catch {
      return sum;
    }
  }, new Decimal(0));

  function handleRemove(partId: string) {
    startTransition(async () => {
      const result = await removeRepairPartAction({ partId, itemId });
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
      {error && (
        <p role="alert" className="mb-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {showForm && (
        <RepairPartAddForm
          itemId={itemId}
          onAdded={(part) => setParts((prev) => [part, ...prev])}
          onClose={() => setShowForm(false)}
        />
      )}

      <RepairPartsList
        parts={parts}
        partsTotal={partsTotal}
        isPending={isPending}
        onRemove={handleRemove}
      />
    </CardSection>
  );
}
