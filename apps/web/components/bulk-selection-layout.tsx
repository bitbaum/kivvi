"use client";

import { BulkActionToolbar } from "@/components/bulk-action-toolbar";
import { BulkResultBanner } from "@/components/bulk-result-banner";
import { BulkConfirmDialog } from "@/components/bulk-confirm-dialog";
import type { BulkSelection } from "@/hooks/use-bulk-selection";

/**
 * The chrome around a bulk-selectable list: result banner above, action
 * toolbar below, confirmation dialog on top. The list itself (`children`) and
 * the toolbar's buttons (`actions`) stay with the caller — they differ per
 * entity; this wrapper does not.
 */
export function BulkSelectionLayout({
  bulk,
  labels,
  actions,
  children,
}: {
  bulk: BulkSelection;
  labels: Record<string, string>;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  const { selection, selectedIds, bulkResult, dismissBanner, isPending, confirmAction } = bulk;

  return (
    <>
      <BulkResultBanner result={bulkResult} labels={labels} onDismiss={dismissBanner} />

      {children}

      {/* Bulk action toolbar */}
      <BulkActionToolbar
        count={selection.count}
        selectedLabel={labels.selected}
        clearLabel={labels.clearSelection}
        onClear={selection.clear}
      >
        {actions}
      </BulkActionToolbar>

      {/* Confirmation dialog */}
      {confirmAction && (
        <BulkConfirmDialog
          title={labels.confirmTitle}
          message={(confirmAction === "delete"
            ? labels.confirmDelete
            : labels.confirmDeactivate
          ).replace("{count}", String(selectedIds.length))}
          confirmLabel={isPending ? labels.processing : labels.confirmAction}
          cancelLabel={labels.cancel}
          isLoading={isPending}
          onConfirm={() => bulk.executeAction(confirmAction)}
          onCancel={bulk.cancelConfirm}
        />
      )}
    </>
  );
}
