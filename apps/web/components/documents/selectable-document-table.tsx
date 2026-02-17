'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSelection } from '@/hooks/use-selection';
import { BulkActionToolbar } from '@/components/bulk-action-toolbar';
import { BulkResultBanner } from '@/components/bulk-result-banner';
import { DocumentBulkActions } from './document-bulk-actions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { STATUS_STYLES, toCamelCase } from '@/lib/config/document-types';
import type { DocumentTypeConfig } from '@/lib/config/document-types';
import type { BulkOperationResult } from '@/app/actions/bulk-operations';
import { useState } from 'react';

interface DocumentItem {
  id: string;
  number: string;
  status: string;
  total: string;
  issueDate: string | Date;
  dueDate?: string | Date | null;
  contact?: { id: string; name: string } | null;
}

interface Translations {
  statusLabels: Record<string, string>;
  columnLabels: {
    number: string;
    contact: string;
    total: string;
    status: string;
    date: string;
    noContact: string;
  };
  bulkLabels: Record<string, string>;
}

interface SelectableDocumentTableProps {
  config: DocumentTypeConfig;
  data: DocumentItem[];
  translations: Translations;
}

export function SelectableDocumentTable({
  config,
  data,
  translations,
}: SelectableDocumentTableProps) {
  const router = useRouter();
  const allIds = useMemo(() => data.map((d) => d.id), [data]);
  const { selectedIds, toggle, toggleAll, clear, isSelected, isAllSelected, isSomeSelected, count } =
    useSelection(allIds);
  const [bulkResult, setBulkResult] = useState<BulkOperationResult | null>(null);

  const selectedStatuses = useMemo(
    () => [...new Set(data.filter((d) => selectedIds.includes(d.id)).map((d) => d.status))],
    [data, selectedIds]
  );

  const handleComplete = useCallback(
    (result: BulkOperationResult) => {
      setBulkResult(result);
      clear();
    },
    [clear]
  );

  const dismissBanner = useCallback(() => setBulkResult(null), []);

  function isOverdue(doc: DocumentItem): boolean {
    if (!config.hasPayments) return false;
    if (doc.status === 'paid' || doc.status === 'cancelled') return false;
    return !!doc.dueDate && new Date(doc.dueDate) < new Date();
  }

  return (
    <>
      <BulkResultBanner
        result={bulkResult}
        labels={translations.bulkLabels}
        onDismiss={dismissBanner}
      />

      {/* Table header */}
      <div className="hidden border-b px-4 py-3 text-sm font-medium text-muted-foreground sm:grid sm:grid-cols-[auto_1fr_1.5fr_auto_auto_auto] sm:gap-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
        <span>{translations.columnLabels.number}</span>
        <span>{translations.columnLabels.contact}</span>
        <span className="text-right">{translations.columnLabels.total}</span>
        <span className="px-4 text-center">{translations.columnLabels.status}</span>
        <span className="text-right">{translations.columnLabels.date}</span>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {data.map((doc) => {
          const overdue = isOverdue(doc);
          const displayStatus = overdue && doc.status !== 'overdue' ? 'overdue' : doc.status;
          return (
            <div
              key={doc.id}
              onClick={() => router.push(`${config.basePath}/${doc.id}`)}
              className={`flex cursor-pointer flex-col gap-1 p-4 hover:bg-muted/50 sm:grid sm:grid-cols-[auto_1fr_1.5fr_auto_auto_auto] sm:items-center sm:gap-4 ${
                isSelected(doc.id) ? 'bg-primary/5' : ''
              }`}
            >
              <div
                className="flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isSelected(doc.id)}
                  onChange={() => toggle(doc.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>
              <div>
                <span className="font-medium">{doc.number}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {doc.contact?.name || translations.columnLabels.noContact}
              </div>
              <div className="text-right font-medium">
                {formatCurrency(Number(doc.total))}
              </div>
              <div className="px-4 text-center">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[displayStatus] || STATUS_STYLES.draft
                  }`}
                >
                  {translations.statusLabels[toCamelCase(displayStatus)] || displayStatus}
                </span>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {formatDate(doc.issueDate)}
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
        <DocumentBulkActions
          selectedIds={selectedIds}
          actions={config.bulkActions}
          selectedStatuses={selectedStatuses}
          labels={translations.bulkLabels}
          onComplete={handleComplete}
        />
      </BulkActionToolbar>
    </>
  );
}
