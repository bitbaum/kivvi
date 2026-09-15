"use client";

import { useCallback, useState, useTransition } from "react";
import { useSelection } from "@/hooks/use-selection";
import type { BulkOperationResult } from "@/app/actions/bulk-operations";
import type { ActionResult } from "@/app/actions/utils";

export type BulkAction = "delete" | "deactivate";

/**
 * Selection + confirm + run + report, for any list that offers bulk actions.
 *
 * The caller supplies the ids (memoised) and a `run` that maps an action onto
 * its Server Action; everything else — the two-step confirm, the pending
 * transition, resetting the selection, the result banner state — is the same
 * for every list, so it lives here once.
 */
export function useBulkSelection(
  ids: string[],
  run: (action: BulkAction, selectedIds: string[]) => Promise<ActionResult<BulkOperationResult>>,
) {
  const selection = useSelection(ids);
  const { clear, selectedIds } = selection;

  const [bulkResult, setBulkResult] = useState<BulkOperationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  const handleComplete = useCallback(
    (result: BulkOperationResult) => {
      setBulkResult(result);
      clear();
    },
    [clear],
  );

  const dismissBanner = useCallback(() => setBulkResult(null), []);

  const executeAction = useCallback(
    (action: BulkAction) => {
      // First click asks; the dialog's confirm calls back in to run it.
      if (!confirmAction) {
        setConfirmAction(action);
        return;
      }
      setConfirmAction(null);
      startTransition(async () => {
        const result = await run(action, selectedIds);
        if (result.success && result.data) {
          handleComplete(result.data);
        } else {
          handleComplete({
            successCount: 0,
            failureCount: selectedIds.length,
            results: [],
          });
        }
      });
    },
    [confirmAction, handleComplete, run, selectedIds],
  );

  return {
    selection,
    selectedIds,
    bulkResult,
    dismissBanner,
    isPending,
    confirmAction,
    cancelConfirm: useCallback(() => setConfirmAction(null), []),
    executeAction,
  };
}

export type BulkSelection = ReturnType<typeof useBulkSelection>;
