'use client';

import { useState, useTransition } from 'react';
import type { BulkActionDef } from '@/lib/config/document-types';
import {
  bulkConvertDocumentsAction,
  bulkStatusChangeAction,
  bulkDeleteDocumentsAction,
  bulkExtendQuoteValidityAction,
} from '@/app/actions/bulk-operations';
import type { BulkOperationResult } from '@/app/actions/bulk-operations';

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
  const [confirmAction, setConfirmAction] = useState<BulkActionDef | null>(null);
  const [extensionDays, setExtensionDays] = useState(30);

  function isActionApplicable(action: BulkActionDef): boolean {
    if (!action.applicableStatuses) return true;
    return selectedStatuses.every((s) => action.applicableStatuses!.includes(s as never));
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
        case 'convert':
          result = await bulkConvertDocumentsAction({
            documentIds: selectedIds,
            targetType: action.targetType,
          });
          break;
        case 'status_change':
          result = await bulkStatusChangeAction({
            documentIds: selectedIds,
            targetStatus: action.targetStatus,
          });
          break;
        case 'delete':
          result = await bulkDeleteDocumentsAction({
            documentIds: selectedIds,
          });
          break;
        case 'extend_validity':
          result = await bulkExtendQuoteValidityAction({
            quoteIds: selectedIds,
            extensionDays,
          });
          break;
        default:
          return;
      }
      if (result.success && result.data) {
        onComplete(result.data);
      } else {
        onComplete({ successCount: 0, failureCount: selectedIds.length, results: [] });
      }
    });
  }

  const variantClasses: Record<string, string> = {
    default: 'border bg-background text-foreground hover:bg-muted',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <>
      {actions.filter(isActionApplicable).map((action) => (
        <button
          key={action.id}
          onClick={() => executeAction(action)}
          disabled={isPending}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            variantClasses[action.variant] || variantClasses.default
          }`}
        >
          {labels[action.label] || action.label}
        </button>
      ))}

      {/* Extend validity input */}
      {actions.some((a) => a.action === 'extend_validity') && isActionApplicable(actions.find((a) => a.action === 'extend_validity')!) && (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={365}
            value={extensionDays}
            onChange={(e) => setExtensionDays(parseInt(e.target.value) || 30)}
            className="w-16 rounded-lg border bg-background px-2 py-1.5 text-sm"
          />
          <span className="text-xs text-muted-foreground">{labels.days || 'days'}</span>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold">{labels.confirmTitle || 'Confirm'}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {(labels.confirmMessage || 'Are you sure you want to {action} {count} items?')
                .replace('{action}', labels[confirmAction.label] || confirmAction.label)
                .replace('{count}', String(selectedIds.length))}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {labels.cancel || 'Cancel'}
              </button>
              <button
                onClick={() => executeAction(confirmAction)}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? labels.processing || 'Processing...' : labels.confirmAction || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
