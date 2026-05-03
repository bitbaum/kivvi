"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { BulkActionDef } from "@/lib/config/document-types";
import {
  bulkConvertDocumentsAction,
  bulkStatusChangeAction,
  bulkDeleteDocumentsAction,
  bulkExtendQuoteValidityAction,
  bulkMarkPaidAction,
} from "@/app/actions/bulk-operations";
import type { BulkOperationResult } from "@/app/actions/bulk-operations";
import { cn } from "@/lib/utils";
import { BulkConfirmDialog } from "@/components/bulk-confirm-dialog";

interface DocumentBulkActionsProps {
  selectedIds: string[];
  actions: BulkActionDef[];
  selectedStatuses: string[];
  labels: Record<string, string>;
  onComplete: (result: BulkOperationResult) => void;
}

export function DocumentBulkActions({
  selectedIds,
  actions,
  selectedStatuses,
  labels,
  onComplete,
}: DocumentBulkActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<BulkActionDef | null>(
    null,
  );
  const [extensionDays, setExtensionDays] = useState(30);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  function isActionApplicable(action: BulkActionDef): boolean {
    const { applicableStatuses } = action;
    if (!applicableStatuses) return true;
    return selectedStatuses.every((s) =>
      applicableStatuses.includes(s as never),
    );
  }

  function executeAction(action: BulkActionDef) {
    if (action.requiresConfirmation && !confirmAction) {
      setConfirmAction(action);
      return;
    }
    setConfirmAction(null);

    startTransition(async () => {
      let result;
      switch (action.action) {
        case "convert":
          result = await bulkConvertDocumentsAction({
            documentIds: selectedIds,
            targetType: action.targetType,
          });
          break;
        case "status_change":
          result = await bulkStatusChangeAction({
            documentIds: selectedIds,
            targetStatus: action.targetStatus,
          });
          break;
        case "delete":
          result = await bulkDeleteDocumentsAction({
            documentIds: selectedIds,
          });
          break;
        case "extend_validity":
          result = await bulkExtendQuoteValidityAction({
            quoteIds: selectedIds,
            extensionDays,
          });
          break;
        case "mark_paid":
          result = await bulkMarkPaidAction({
            documentIds: selectedIds,
            paymentDate,
            method: "bank_transfer",
          });
          break;
        default:
          return;
      }
      if (result.success && result.data) {
        onComplete(result.data);
      } else {
        onComplete({
          successCount: 0,
          failureCount: selectedIds.length,
          results: [],
        });
      }
    });
  }

  const variantClasses: Record<string, string> = {
    default: "border bg-background text-foreground hover:bg-muted",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };

  return (
    <>
      {actions.filter(isActionApplicable).map((action) => (
        <button
          key={action.id}
          onClick={() => executeAction(action)}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
            variantClasses[action.variant] || variantClasses.default,
          )}
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {labels[action.label] || action.label}
        </button>
      ))}

      {/* Payment date picker for mark_paid */}
      {actions.some((a) => a.action === "mark_paid") &&
        isActionApplicable(actions.find((a) => a.action === "mark_paid")!) && (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-8 rounded-lg border bg-background px-2 text-sm"
            />
          </div>
        )}

      {/* Extend validity input */}
      {actions.some((a) => a.action === "extend_validity") &&
        isActionApplicable(
          actions.find((a) => a.action === "extend_validity")!,
        ) && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={365}
              value={extensionDays}
              onChange={(e) => setExtensionDays(parseInt(e.target.value) || 30)}
              className="w-16 rounded-lg border bg-background px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              {labels.days || "days"}
            </span>
          </div>
        )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <BulkConfirmDialog
          title={labels.confirmTitle || "Confirm"}
          message={(
            labels.confirmMessage ||
            "Are you sure you want to {action} {count} items?"
          )
            .replace(
              "{action}",
              labels[confirmAction.label] || confirmAction.label,
            )
            .replace("{count}", String(selectedIds.length))}
          confirmLabel={
            isPending
              ? labels.processing || "Processing..."
              : labels.confirmAction || "Confirm"
          }
          cancelLabel={labels.cancel || "Cancel"}
          isLoading={isPending}
          onConfirm={() => executeAction(confirmAction)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
