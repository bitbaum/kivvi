import Decimal from "decimal.js";
import { useState } from "react";
import { TESTABLE_STATUSES } from "@/lib/config/inventory-items";
import type {
  ChecklistTemplate,
  ChecklistData,
  ChecklistItemCompletion,
} from "@kivvi/core/src/config/checklist-templates";
import {
  areBlockingChecksPassed,
  suggestCondition,
} from "@kivvi/core/src/config/checklist-templates";

export type CheckResult = "pass" | "fail" | "skip" | null;

export interface CheckState {
  result: CheckResult;
  value: string;
  skipReason: string;
}

interface UseChecklistStateProps {
  userId: string;
  category: string;
  template: ChecklistTemplate;
  existingData: ChecklistData | null;
  currentCondition: string;
  currentStatus: string;
  askingPrice: string | null;
}

export function useChecklistState({
  userId,
  template,
  existingData,
  currentCondition,
  currentStatus,
  askingPrice,
}: UseChecklistStateProps) {
  const existingMap = new Map((existingData?.completions ?? []).map((c) => [c.id, c]));

  const [states, setStates] = useState<Record<string, CheckState>>(() =>
    Object.fromEntries(
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
    ),
  );

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

  const completions = buildCompletions();
  const { passed: blockingOk } = areBlockingChecksPassed(template, completions);
  const hasCondition = !!selectedCondition && selectedCondition !== "untested";
  const hasPriceSet = !!askingPrice && new Decimal(askingPrice).gt(0);

  const failedBlockingSuggestions = template.checks
    .filter(
      (
        c,
      ): c is typeof c & {
        failSuggestsStatus: NonNullable<typeof c.failSuggestsStatus>;
      } => c.blocking && !!c.failSuggestsStatus && states[c.id]?.result === "fail",
    )
    .map((c) => c.failSuggestsStatus);

  const completedCount = Object.values(states).filter((s) => s.result !== null).length;

  const canApprove =
    blockingOk &&
    hasCondition &&
    hasPriceSet &&
    (TESTABLE_STATUSES as readonly string[]).includes(currentStatus);

  return {
    states,
    updateCheck,
    selectedCondition,
    setSelectedCondition,
    buildCompletions,
    completedCount,
    totalCount: template.checks.length,
    blockingOk,
    hasCondition,
    hasPriceSet,
    canApprove,
    suggestRepair: failedBlockingSuggestions.includes("repair"),
    suggestScrap: failedBlockingSuggestions.includes("scrap"),
    suggestParts: failedBlockingSuggestions.includes("parts_only"),
  };
}
