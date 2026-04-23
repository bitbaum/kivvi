"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  bulkUpdateItemStatusAction,
  bulkUpdateItemConditionAction,
  bulkUpdateItemAskingPriceAction,
} from "@/app/actions/inventory-items";
import {
  ITEM_STATUS_VALUES,
  ITEM_CONDITION_VALUES,
} from "@kivvi/database/src/enums";
import {
  getStatusLabelKey,
  getConditionLabelKey,
} from "@/lib/config/inventory-items";
import { toast } from "sonner";

interface ItemBatchToolbarProps {
  selectedIds: string[];
  onClear: () => void;
}

export function ItemBatchToolbar({
  selectedIds,
  onClear,
}: ItemBatchToolbarProps) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [statusValue, setStatusValue] = useState("");
  const [conditionValue, setConditionValue] = useState("");
  const [priceValue, setPriceValue] = useState("");

  if (selectedIds.length === 0) return null;

  function applyStatus() {
    if (!statusValue) return;
    startTransition(async () => {
      const result = await bulkUpdateItemStatusAction({
        itemIds: selectedIds,
        newStatus: statusValue,
      });
      if (result.success && result.data) {
        toast.success(
          `${result.data.succeeded} ${t("updated")}${result.data.failed > 0 ? `, ${result.data.failed} ${t("failed")}` : ""}`,
        );
        onClear();
        setStatusValue("");
      } else {
        toast.error(result.error || tc("error"));
      }
    });
  }

  function applyCondition() {
    if (!conditionValue) return;
    startTransition(async () => {
      const result = await bulkUpdateItemConditionAction({
        itemIds: selectedIds,
        condition: conditionValue,
      });
      if (result.success && result.data) {
        toast.success(
          `${result.data.succeeded} ${t("updated")}${result.data.failed > 0 ? `, ${result.data.failed} ${t("failed")}` : ""}`,
        );
        onClear();
        setConditionValue("");
      } else {
        toast.error(result.error || tc("error"));
      }
    });
  }

  function applyPrice() {
    if (!priceValue || !/^\d+(\.\d{1,2})?$/.test(priceValue)) return;
    startTransition(async () => {
      const result = await bulkUpdateItemAskingPriceAction({
        itemIds: selectedIds,
        askingPrice: priceValue,
      });
      if (result.success && result.data) {
        toast.success(
          `${result.data.succeeded} ${t("updated")}${result.data.failed > 0 ? `, ${result.data.failed} ${t("failed")}` : ""}`,
        );
        onClear();
        setPriceValue("");
      } else {
        toast.error(result.error || tc("error"));
      }
    });
  }

  const editableStatuses = ITEM_STATUS_VALUES.filter(
    (s) => !["sold", "returned"].includes(s),
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card p-3 shadow-lg sm:left-64">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
        <span className="text-sm font-medium">
          {selectedIds.length} {tc("selected")}
        </span>

        <div className="flex items-center gap-1.5">
          <select
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
            className="rounded-lg border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">{t("setStatus")}</option>
            {editableStatuses.map((s) => (
              <option key={s} value={s}>
                {t(getStatusLabelKey(s))}
              </option>
            ))}
          </select>
          <button
            onClick={applyStatus}
            disabled={!statusValue || isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              tc("apply")
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={conditionValue}
            onChange={(e) => setConditionValue(e.target.value)}
            className="rounded-lg border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">{t("setCondition")}</option>
            {ITEM_CONDITION_VALUES.map((c) => (
              <option key={c} value={c}>
                {t(getConditionLabelKey(c))}
              </option>
            ))}
          </select>
          <button
            onClick={applyCondition}
            disabled={!conditionValue || isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              tc("apply")
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="0"
            step="0.05"
            placeholder={t("bulkSetPrice")}
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            className="w-28 rounded-lg border bg-background px-2 py-1.5 text-sm"
          />
          <button
            onClick={applyPrice}
            disabled={
              !priceValue || !/^\d+(\.\d{1,2})?$/.test(priceValue) || isPending
            }
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              tc("apply")
            )}
          </button>
        </div>

        <button
          onClick={onClear}
          className="ml-auto rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
        >
          {tc("clear")}
        </button>
      </div>
    </div>
  );
}
