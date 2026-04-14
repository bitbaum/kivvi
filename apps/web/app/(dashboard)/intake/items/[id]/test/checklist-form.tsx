"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  recordChecklistAction,
  updateItemStatusAction,
  updateItemConditionAction,
} from "@/app/actions/inventory-items";
import type {
  ChecklistTemplate,
  ChecklistCheckDef,
  ChecklistItemCompletion,
  ChecklistData,
} from "@kivvi/core/src/config/checklist-templates";
import {
  areBlockingChecksPassed,
  suggestCondition,
} from "@kivvi/core/src/config/checklist-templates";
import { ITEM_CONDITION_VALUES } from "@kivvi/database/src/enums";
import {
  getConditionLabelKey,
  getStatusLabelKey,
} from "@/lib/config/inventory-items";

// ============================================================================
// Types
// ============================================================================

type CheckResult = "pass" | "fail" | "skip" | null;

interface CheckState {
  result: CheckResult;
  value: string;
  skipReason: string;
}

interface ChecklistFormProps {
  itemId: string;
  userId: string;
  category: string;
  template: ChecklistTemplate;
  existingData: ChecklistData | null;
  currentCondition: string;
  currentStatus: string;
}

// ============================================================================
// Single check row
// ============================================================================

function CheckRow({
  check,
  state,
  onChange,
  tl,
  tc,
}: {
  check: ChecklistCheckDef;
  state: CheckState;
  onChange: (s: CheckState) => void;
  tl: (key: string) => string;
  tc: (key: string) => string;
}) {
  const label = tl(check.labelKey);
  const isBlocking = check.blocking;

  function setResult(r: CheckResult) {
    onChange({ ...state, result: r });
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        state.result === "pass" &&
          "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20",
        state.result === "fail" &&
          "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20",
        state.result === "skip" &&
          "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20",
        !state.result && "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{label}</span>
            {isBlocking && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {tl("blockingBadge")}
              </span>
            )}
          </div>

          {/* Measurement input */}
          {check.type === "measurement" && state.result !== "skip" && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder={tc("measurementPlaceholder")}
                value={state.value}
                onChange={(e) =>
                  onChange({
                    ...state,
                    value: e.target.value,
                    result: e.target.value ? "pass" : null,
                  })
                }
                className="w-28 rounded-lg border px-3 py-1.5 text-sm"
              />
              {check.unit && (
                <span className="text-sm text-muted-foreground">
                  {check.unit}
                </span>
              )}
            </div>
          )}

          {/* Confirm type */}
          {check.type === "confirm" && (
            <label className="mt-2 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.result === "pass"}
                onChange={(e) => setResult(e.target.checked ? "pass" : null)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-muted-foreground">
                {tc("confirmCheck")}
              </span>
            </label>
          )}

          {/* Skip reason */}
          {state.result === "skip" && (
            <input
              type="text"
              placeholder={tc("skipReason")}
              value={state.skipReason}
              onChange={(e) =>
                onChange({ ...state, skipReason: e.target.value })
              }
              className="mt-2 w-full rounded-lg border px-3 py-1.5 text-sm"
            />
          )}
        </div>

        {/* Pass/Fail/Skip buttons (for pass_fail type) */}
        {check.type === "pass_fail" && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setResult(state.result === "pass" ? null : "pass")}
              className={cn(
                "rounded-lg p-2 transition-colors",
                state.result === "pass"
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-700",
              )}
              title={tc("passLabel")}
            >
              <CheckCircle2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setResult(state.result === "fail" ? null : "fail")}
              className={cn(
                "rounded-lg p-2 transition-colors",
                state.result === "fail"
                  ? "bg-red-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-red-100 hover:text-red-700",
              )}
              title={tc("failLabel")}
            >
              <XCircle className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setResult(state.result === "skip" ? null : "skip")}
              className={cn(
                "rounded-lg p-2 transition-colors",
                state.result === "skip"
                  ? "bg-yellow-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-yellow-100 hover:text-yellow-700",
              )}
              title={tc("skipLabel")}
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Fail suggestion */}
      {state.result === "fail" && check.failSuggestsStatus && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {tl("failSuggestion").replace("{status}", check.failSuggestsStatus)}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main form
// ============================================================================

export function ChecklistForm({
  itemId,
  userId,
  category,
  template,
  existingData,
  currentCondition,
  currentStatus,
}: ChecklistFormProps) {
  const router = useRouter();
  const tl = useTranslations("checklist");
  const tc = useTranslations("inventory");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Initialise check states from existing data or blank
  const initStates = (): Record<string, CheckState> => {
    const existingMap = new Map(
      (existingData?.completions ?? []).map((c) => [c.id, c]),
    );
    return Object.fromEntries(
      template.checks.map((check) => {
        const existing = existingMap.get(check.id);
        return [
          check.id,
          {
            result: existing?.result ?? null,
            value: existing?.value ?? "",
            skipReason: existing?.skipReason ?? "",
          },
        ];
      }),
    );
  };

  const [states, setStates] = useState<Record<string, CheckState>>(initStates);
  const [selectedCondition, setSelectedCondition] = useState(
    currentCondition === "untested" ? "" : currentCondition,
  );

  function updateCheck(id: string, state: CheckState) {
    const newStates = { ...states, [id]: state };
    setStates(newStates);

    // Auto-suggest condition when all required checks are attempted
    const completions = Object.entries(newStates)
      .filter(([, s]) => s.result !== null)
      .map(([cid, s]) => ({
        id: cid,
        result: s.result as "pass" | "fail" | "skip",
        value: s.value || undefined,
        skipReason: s.skipReason || undefined,
        completedAt: new Date().toISOString(),
        completedBy: userId,
      }));
    const suggested = suggestCondition(completions);
    if (suggested && !selectedCondition) setSelectedCondition(suggested);
  }

  function buildCompletions(): ChecklistItemCompletion[] {
    return Object.entries(states)
      .filter(([, s]) => s.result !== null)
      .map(([id, s]) => ({
        id,
        result: s.result as "pass" | "fail" | "skip",
        value: s.value || undefined,
        skipReason: s.skipReason || undefined,
        completedAt: new Date().toISOString(),
        completedBy: userId,
      }));
  }

  async function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await recordChecklistAction(itemId, {
        category,
        completions: buildCompletions(),
      });
      if (!result.success) {
        setError(result.error ?? "Failed to save");
        return;
      }
      toast.success(tc("checklistSaved"));
    });
  }

  async function handleApprove() {
    setError(null);
    startTransition(async () => {
      // Save checklist first
      const saveResult = await recordChecklistAction(itemId, {
        category,
        completions: buildCompletions(),
      });
      if (!saveResult.success) {
        setError(saveResult.error ?? "Failed to save checklist");
        return;
      }

      // Update condition if changed
      if (selectedCondition && selectedCondition !== currentCondition) {
        const condResult = await updateItemConditionAction(itemId, {
          condition: selectedCondition,
        });
        if (!condResult.success) {
          setError(condResult.error ?? "Failed to update condition");
          return;
        }
      }

      // Transition to ready_for_sale
      const statusResult = await updateItemStatusAction(itemId, {
        newStatus: "ready_for_sale",
      });
      if (!statusResult.success) {
        setError(statusResult.error ?? "Cannot approve for sale");
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
      // Save checklist before routing
      await recordChecklistAction(itemId, {
        category,
        completions: buildCompletions(),
      });
      const result = await updateItemStatusAction(itemId, { newStatus });
      if (!result.success) {
        setError(result.error ?? "Failed to update status");
        return;
      }
      router.push(`/intake/items/${itemId}`);
      router.refresh();
    });
  }

  // Compute current state for the approve button
  const completions = buildCompletions();
  const { passed: blockingOk } = areBlockingChecksPassed(template, completions);
  const hasCondition = !!selectedCondition && selectedCondition !== "untested";

  // Detect if any failing blocking check suggests routing to repair
  const failedBlockingSuggestions = template.checks
    .filter(
      (c) =>
        c.blocking && c.failSuggestsStatus && states[c.id]?.result === "fail",
    )
    .map((c) => c.failSuggestsStatus!);
  const suggestRepair = failedBlockingSuggestions.includes("repair");
  const suggestScrap = failedBlockingSuggestions.includes("scrap");
  const suggestParts = failedBlockingSuggestions.includes("parts_only");

  const completedCount = Object.values(states).filter(
    (s) => s.result !== null,
  ).length;
  const totalCount = template.checks.length;

  const canApprove =
    blockingOk &&
    hasCondition &&
    (currentStatus === "testing" || currentStatus === "intake");

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {tc("checklistProgress")
            .replace("{done}", String(completedCount))
            .replace("{total}", String(totalCount))}
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
        <label className="mb-2 block text-sm font-medium">
          {tc("condition")}
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            ["like_new", "good", "fair", "poor", "parts_only", "scrap"] as const
          ).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCondition(c)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                selectedCondition === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {tc(getConditionLabelKey(c))}
            </button>
          ))}
        </div>
        {!hasCondition && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {tc("conditionRequired")}
          </p>
        )}
      </div>

      {/* Error */}
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

        {/* Routing suggestions for failed blocking checks */}
        {suggestRepair &&
          (currentStatus === "testing" || currentStatus === "intake") && (
            <button
              type="button"
              onClick={() => handleRoute("repair")}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100 disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4" />→ {tc("statusRepair")}
            </button>
          )}
        {suggestParts && (
          <button
            type="button"
            onClick={() => handleRoute("parts_only")}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
          >
            → {tc("statusPartsOnly")}
          </button>
        )}
        {suggestScrap && (
          <button
            type="button"
            onClick={() => handleRoute("recycled")}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
          >
            → {tc("statusRecycled")}
          </button>
        )}

        {/* Approve for sale */}
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending || !canApprove}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
            canApprove
              ? "bg-green-600 text-white hover:bg-green-700"
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
