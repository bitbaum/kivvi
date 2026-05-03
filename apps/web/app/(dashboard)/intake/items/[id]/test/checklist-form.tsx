"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  recordChecklistAction,
  updateItemStatusAction,
  updateItemConditionAction,
} from "@/app/actions/inventory-items";
import type {
  ChecklistTemplate,
  ChecklistData,
} from "@kivvi/core/src/config/checklist-templates";
import {
  getConditionLabelKey,
  TESTABLE_STATUSES,
} from "@/lib/config/inventory-items";
import { ITEM_CONDITION_VALUES } from "@kivvi/database/src/enums";
import { CheckRow } from "./checklist-check-row";
import { useChecklistState } from "./use-checklist-state";

interface ChecklistFormProps {
  itemId: string;
  userId: string;
  category: string;
  template: ChecklistTemplate;
  existingData: ChecklistData | null;
  currentCondition: string;
  currentStatus: string;
  askingPrice: string | null;
}

export function ChecklistForm({
  itemId,
  userId,
  category,
  template,
  existingData,
  currentCondition,
  currentStatus,
  askingPrice,
}: ChecklistFormProps) {
  const router = useRouter();
  const tl = useTranslations("checklist");
  const tc = useTranslations("inventory");
  const tcommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    states,
    updateCheck,
    selectedCondition,
    setSelectedCondition,
    buildCompletions,
    completedCount,
    totalCount,
    blockingOk,
    hasCondition,
    hasPriceSet,
    canApprove,
    suggestRepair,
    suggestScrap,
    suggestParts,
  } = useChecklistState({
    userId,
    category,
    template,
    existingData,
    currentCondition,
    currentStatus,
    askingPrice,
  });

  async function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await recordChecklistAction({
        itemId,
        input: { category, completions: buildCompletions() },
      });
      if (!result.success) {
        setError(result.error ?? tcommon("error"));
        return;
      }
      toast.success(tc("checklistSaved"));
    });
  }

  async function handleApprove() {
    setError(null);
    startTransition(async () => {
      const saveResult = await recordChecklistAction({
        itemId,
        input: { category, completions: buildCompletions() },
      });
      if (!saveResult.success) {
        setError(saveResult.error ?? tcommon("error"));
        return;
      }
      if (selectedCondition && selectedCondition !== currentCondition) {
        const condResult = await updateItemConditionAction({
          itemId,
          input: { condition: selectedCondition },
        });
        if (!condResult.success) {
          setError(condResult.error ?? tcommon("error"));
          return;
        }
      }
      const statusResult = await updateItemStatusAction(itemId, {
        newStatus: "ready_for_sale",
      });
      if (!statusResult.success) {
        setError(statusResult.error ?? tcommon("error"));
        return;
      }
      toast.success(tc("approveForSale"));
      router.push(`/intake/items/${itemId}`);
      router.refresh();
    });
  }

  async function handleRoute(newStatus: string) {
    setError(null);
    startTransition(async () => {
      await recordChecklistAction({
        itemId,
        input: { category, completions: buildCompletions() },
      });
      const result = await updateItemStatusAction(itemId, { newStatus });
      if (!result.success) {
        setError(result.error ?? tcommon("error"));
        return;
      }
      router.push(`/intake/items/${itemId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {tc("checklistProgress", { done: completedCount, total: totalCount })}
        </span>
        <span className="text-xs">
          {Math.round((completedCount / totalCount) * 100)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all rounded-full"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Checks */}
      <div className="space-y-3">
        {template.checks.map((check) => (
          <CheckRow
            key={check.id}
            check={check}
            state={
              states[check.id] ?? { result: null, value: "", skipReason: "" }
            }
            onChange={(s) => updateCheck(check.id, s)}
            tl={tl}
            tc={tc}
          />
        ))}
      </div>

      {/* Condition selector */}
      <div className="rounded-xl border bg-card p-4">
        <span
          id="checklist-condition-label"
          className="mb-2 block text-sm font-medium"
        >
          {tc("condition")}
        </span>
        <div
          role="radiogroup"
          aria-labelledby="checklist-condition-label"
          className="flex flex-wrap gap-2"
        >
          {ITEM_CONDITION_VALUES.filter((c) => c !== "untested").map((c) => {
            const isSelected = selectedCondition === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedCondition(c)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {tc(getConditionLabelKey(c))}
              </button>
            );
          })}
        </div>
        {!hasCondition && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {tc("conditionRequired")}
          </p>
        )}
      </div>

      {/* Missing asking price notice */}
      {blockingOk && hasCondition && !hasPriceSet && (
        <div className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
          <p className="text-sm text-warning">{tc("askingPriceRequired")}</p>
          <Link
            href={`/intake/items/${itemId}/edit`}
            className="ml-4 shrink-0 text-sm font-medium text-warning underline-offset-2 hover:underline"
          >
            {tc("setAskingPrice")}
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {tc("saveChecklist")}
        </button>

        {suggestRepair &&
          (TESTABLE_STATUSES as readonly string[]).includes(currentStatus) && (
            <button
              type="button"
              onClick={() => handleRoute("repair")}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/10 disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4" />→ {tc("statusRepair")}
            </button>
          )}
        {suggestParts && (
          <button
            type="button"
            onClick={() => handleRoute("parts_only")}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            → {tc("statusPartsOnly")}
          </button>
        )}
        {suggestScrap && (
          <button
            type="button"
            onClick={() => handleRoute("recycled")}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral/30 bg-neutral/5 px-4 py-2 text-sm font-medium text-neutral hover:bg-neutral/10 disabled:opacity-50"
          >
            → {tc("statusRecycled")}
          </button>
        )}

        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending || !canApprove}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
            canApprove
              ? "bg-success text-success-foreground hover:bg-success/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? tc("approvingForSale") : tc("approveForSale")}
        </button>
      </div>
    </div>
  );
}
