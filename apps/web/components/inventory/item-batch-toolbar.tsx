"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  bulkUpdateItemStatusAction,
  bulkUpdateItemConditionAction,
} from "@/app/actions/inventory-items";
import {
  ITEM_STATUS_VALUES,
  ITEM_CONDITION_VALUES,
} from "@kivvi/database/src/enums";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  intake: "Intake",
  testing: "Testing",
  repair: "Repair",
  ready_for_sale: "Ready for Sale",
  listed: "Listed",
  reserved: "Reserved",
  sold: "Sold",
  returned: "Returned",
  donated: "Donated",
  recycled: "Recycled",
};

const CONDITION_LABELS: Record<string, string> = {
  untested: "Untested",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  parts_only: "Parts Only",
  scrap: "Scrap",
};

interface ItemBatchToolbarProps {
  selectedIds: string[];
  onClear: () => void;
}

export function ItemBatchToolbar({
  selectedIds,
  onClear,
}: ItemBatchToolbarProps) {
  const [isPending, startTransition] = useTransition();
  const [statusValue, setStatusValue] = useState("");
  const [conditionValue, setConditionValue] = useState("");

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
          `${result.data.succeeded} updated${result.data.failed > 0 ? `, ${result.data.failed} failed` : ""}`,
        );
        onClear();
        setStatusValue("");
      } else {
        toast.error(result.error || "Failed");
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
          `${result.data.succeeded} updated${result.data.failed > 0 ? `, ${result.data.failed} failed` : ""}`,
        );
        onClear();
        setConditionValue("");
      } else {
        toast.error(result.error || "Failed");
      }
    });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card p-3 shadow-lg sm:left-64">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
        <span className="text-sm font-medium">
          {selectedIds.length} selected
        </span>

        <div className="flex items-center gap-1.5">
          <select
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
            className="rounded-lg border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Set status...</option>
            {ITEM_STATUS_VALUES.filter(
              (s) => !["sold", "returned"].includes(s),
            ).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] || s}
              </option>
            ))}
          </select>
          <button
            onClick={applyStatus}
            disabled={!statusValue || isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={conditionValue}
            onChange={(e) => setConditionValue(e.target.value)}
            className="rounded-lg border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Set condition...</option>
            {ITEM_CONDITION_VALUES.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABELS[c] || c}
              </option>
            ))}
          </select>
          <button
            onClick={applyCondition}
            disabled={!conditionValue || isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </button>
        </div>

        <button
          onClick={onClear}
          className="ml-auto rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
