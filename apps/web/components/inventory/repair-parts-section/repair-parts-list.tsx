"use client";

import Decimal from "decimal.js";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { RepairPartWithProduct } from "@kivvi/core/src/domain/inventory-items";

interface Props {
  parts: RepairPartWithProduct[];
  partsTotal: Decimal;
  isPending: boolean;
  onRemove: (id: string) => void;
}

export function RepairPartsList({
  parts,
  partsTotal,
  isPending,
  onRemove,
}: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");

  if (parts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("repairPartsEmpty")}</p>
    );
  }

  return (
    <div className="space-y-1">
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
                <p className="text-xs text-muted-foreground">{part.notes}</p>
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
                onClick={() => onRemove(part.id)}
                disabled={isPending}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                title={tc("delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
      <div className="flex justify-between border-t px-2 pt-2 text-sm font-medium">
        <span>{t("repairPartsTotal")}</span>
        <span className="tabular-nums">
          {formatCurrency(partsTotal.toFixed(2))}
        </span>
      </div>
    </div>
  );
}
