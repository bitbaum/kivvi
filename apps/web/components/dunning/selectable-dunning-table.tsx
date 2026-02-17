'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { useSelection } from '@/hooks/use-selection';
import { BulkActionToolbar } from '@/components/bulk-action-toolbar';
import { BulkResultBanner } from '@/components/bulk-result-banner';
import { bulkSendDunningAction } from '@/app/actions/bulk-operations';
import type { BulkOperationResult } from '@/app/actions/bulk-operations';
import { STATUS_STYLES, toCamelCase } from '@/lib/config/document-types';
import { formatCurrency } from '@/lib/utils';
import { createDunningAction } from '@/app/actions/dunning';

interface OverdueInvoice {
  id: string;
  number: string;
  contactName: string | null;
  total: string;
  daysOverdue: number;
  dunningLevel: number;
  status: string;
}

interface Translations {
  columnLabels: {
    invoice: string;
    customer: string;
    amount: string;
    daysOverdue: string;
    level: string;
    action: string;
    noCustomer: string;
    maxLevel: string;
  };
  statusLabels: Record<string, string>;
  dunningButtonLabels: Record<number, string>;
  bulkLabels: Record<string, string>;
}

interface SelectableDunningTableProps {
  data: OverdueInvoice[];
  translations: Translations;
}

export function SelectableDunningTable({ data, translations }: SelectableDunningTableProps) {
  // Only invoices with dunningLevel < 3 are selectable
  const selectableIds = useMemo(
    () => data.filter((inv) => inv.dunningLevel < 3).map((inv) => inv.id),
    [data]
  );
  const { selectedIds, toggle, toggleAll, clear, isSelected, isAllSelected, isSomeSelected, count } =
    useSelection(selectableIds);
  const [bulkResult, setBulkResult] = useState<BulkOperationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Per-row action state
  const [rowPending, setRowPending] = useState<Record<string, boolean>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const handleComplete = useCallback(
    (result: BulkOperationResult) => {
      setBulkResult(result);
      clear();
    },
    [clear]
  );

  const dismissBanner = useCallback(() => setBulkResult(null), []);

  function executeBulkDunning() {
    startTransition(async () => {
      const result = await bulkSendDunningAction({ invoiceIds: selectedIds });
      if (result.success && result.data) {
        handleComplete(result.data);
      } else {
        handleComplete({ successCount: 0, failureCount: selectedIds.length, results: [] });
      }
    });
  }

  function handleRowDunning(invoiceId: string) {
    setRowPending((prev) => ({ ...prev, [invoiceId]: true }));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[invoiceId];
      return next;
    });
    startTransition(async () => {
      const result = await createDunningAction(invoiceId);
      setRowPending((prev) => ({ ...prev, [invoiceId]: false }));
      if (!result.success) {
        setRowErrors((prev) => ({ ...prev, [invoiceId]: result.error || 'Failed' }));
      }
    });
  }

  return (
    <>
      <BulkResultBanner result={bulkResult} labels={translations.bulkLabels} onDismiss={dismissBanner} />

      {/* Table header */}
      <div className="hidden border-b px-4 py-3 text-sm font-medium text-muted-foreground sm:grid sm:grid-cols-[auto_1fr_1.5fr_auto_auto_auto_auto] sm:gap-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
        <span>{translations.columnLabels.invoice}</span>
        <span>{translations.columnLabels.customer}</span>
        <span className="text-right">{translations.columnLabels.amount}</span>
        <span className="px-4 text-center">{translations.columnLabels.daysOverdue}</span>
        <span className="px-4 text-center">{translations.columnLabels.level}</span>
        <span className="text-right">{translations.columnLabels.action}</span>
      </div>

      {/* Table rows */}
      <div className="divide-y">
        {data.map((inv) => {
          const canSelect = inv.dunningLevel < 3;
          return (
            <div
              key={inv.id}
              className={`flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[auto_1fr_1.5fr_auto_auto_auto_auto] sm:items-center sm:gap-4 ${
                isSelected(inv.id) ? 'bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center">
                {canSelect ? (
                  <input
                    type="checkbox"
                    checked={isSelected(inv.id)}
                    onChange={() => toggle(inv.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                ) : (
                  <div className="h-4 w-4" />
                )}
              </div>
              <div>
                <Link
                  href={`/sales/invoices/${inv.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {inv.number}
                </Link>
              </div>
              <div className="text-sm text-muted-foreground">
                {inv.contactName || translations.columnLabels.noCustomer}
              </div>
              <div className="text-right font-medium">
                {formatCurrency(Number(inv.total))}
              </div>
              <div className="px-4 text-center">
                <span className={`text-sm font-medium ${
                  inv.daysOverdue > 60 ? 'text-red-600 dark:text-red-400' :
                  inv.daysOverdue > 30 ? 'text-orange-600 dark:text-orange-400' :
                  'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {inv.daysOverdue}d
                </span>
              </div>
              <div className="px-4 text-center">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[inv.status] || STATUS_STYLES.draft
                  }`}
                >
                  {translations.statusLabels[toCamelCase(inv.status)] || inv.status}
                </span>
              </div>
              <div className="text-right">
                {inv.dunningLevel < 3 ? (
                  <div>
                    <button
                      onClick={() => handleRowDunning(inv.id)}
                      disabled={rowPending[inv.id] || isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" />
                      {rowPending[inv.id]
                        ? translations.bulkLabels.processing
                        : translations.dunningButtonLabels[inv.dunningLevel] || 'Escalate'}
                    </button>
                    {rowErrors[inv.id] && (
                      <p className="mt-1 text-xs text-red-600">{rowErrors[inv.id]}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">{translations.columnLabels.maxLevel}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk action toolbar */}
      <BulkActionToolbar
        count={count}
        selectedLabel={translations.bulkLabels.selected}
        clearLabel={translations.bulkLabels.clearSelection}
        onClear={clear}
      >
        <button
          onClick={executeBulkDunning}
          disabled={isPending}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {translations.bulkLabels.sendDunning}
          </span>
        </button>
      </BulkActionToolbar>
    </>
  );
}
