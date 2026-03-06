'use client';

import { useCallback, useMemo, useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelection } from '@/hooks/use-selection';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BulkActionToolbar } from '@/components/bulk-action-toolbar';
import { BulkResultBanner } from '@/components/bulk-result-banner';
import {
  bulkDeleteContactsAction,
  bulkDeactivateContactsAction,
} from '@/app/actions/bulk-operations';
import type { BulkOperationResult } from '@/app/actions/bulk-operations';
import { cn, formatDate } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { CONTACT_TYPE_STYLES } from '@/lib/config/contact-types';
import { SortableHeader } from '@/components/sortable-header';

interface ContactItem {
  id: string;
  contactNumber: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  type: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  city: string | null;
  isActive: boolean | null;
  lastDocumentAt?: Date | null;
}

interface Translations {
  columnLabels: {
    number: string;
    name: string;
    type: string;
    email: string;
    phone: string;
    city: string;
    lastDocument: string;
    status: string;
    active: string;
    inactive: string;
  };
  typeLabels: Record<string, string>;
  bulkLabels: Record<string, string>;
}

interface SortProps {
  field: string;
  order: 'asc' | 'desc';
  hrefs: Record<string, string>;
}

interface SelectableContactTableProps {
  data: ContactItem[];
  translations: Translations;
  sort?: SortProps;
}

export function SelectableContactTable({ data, translations, sort }: SelectableContactTableProps) {
  const tc = useTranslations('common');
  const router = useRouter();
  const allIds = useMemo(() => data.map((c) => c.id), [data]);
  const { selectedIds, toggle, toggleAll, clear, isSelected, isAllSelected, isSomeSelected, count } =
    useSelection(allIds);
  const [bulkResult, setBulkResult] = useState<BulkOperationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<'delete' | 'deactivate' | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  useFocusTrap(confirmRef, !!confirmAction);

  const handleComplete = useCallback(
    (result: BulkOperationResult) => {
      setBulkResult(result);
      clear();
    },
    [clear]
  );

  const dismissBanner = useCallback(() => setBulkResult(null), []);

  function executeAction(action: 'delete' | 'deactivate') {
    if (!confirmAction) {
      setConfirmAction(action);
      return;
    }
    setConfirmAction(null);
    startTransition(async () => {
      const result = action === 'delete'
        ? await bulkDeleteContactsAction({ contactIds: selectedIds })
        : await bulkDeactivateContactsAction({ contactIds: selectedIds });
      if (result.success && result.data) {
        handleComplete(result.data);
      } else {
        handleComplete({ successCount: 0, failureCount: selectedIds.length, results: [] });
      }
    });
  }

  return (
    <>
      <BulkResultBanner result={bulkResult} labels={translations.bulkLabels} onDismiss={dismissBanner} />

      {/* Table header — hidden on mobile */}
      <div className="hidden border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto] sm:gap-4 lg:grid-cols-[auto_1fr_2fr_auto_1.5fr_1fr_1fr_1fr_auto]">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
            onChange={toggleAll}
            aria-label={tc('aria.selectAll')}
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
        <div>
          {sort ? (
            <SortableHeader label={translations.columnLabels.number} field="contactNumber" currentSort={sort.field} currentOrder={sort.order} href={sort.hrefs.contactNumber} />
          ) : translations.columnLabels.number}
        </div>
        <div>
          {sort ? (
            <SortableHeader label={translations.columnLabels.name} field="name" currentSort={sort.field} currentOrder={sort.order} href={sort.hrefs.name} />
          ) : translations.columnLabels.name}
        </div>
        <div>{translations.columnLabels.type}</div>
        <div className="hidden lg:block">{translations.columnLabels.email}</div>
        <div className="hidden lg:block">{translations.columnLabels.phone}</div>
        <div className="hidden lg:block">
          {sort ? (
            <SortableHeader label={translations.columnLabels.city} field="city" currentSort={sort.field} currentOrder={sort.order} href={sort.hrefs.city} />
          ) : translations.columnLabels.city}
        </div>
        <div className="hidden lg:block">{translations.columnLabels.lastDocument}</div>
        <div>{translations.columnLabels.status}</div>
      </div>

      {/* Table rows */}
      <div className="divide-y">
        {data.map((contact) => (
          <div
            key={contact.id}
            role="link"
            tabIndex={0}
            onClick={() => router.push(`/contacts/${contact.id}`)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/contacts/${contact.id}`); } }}
            className={cn(
              'flex cursor-pointer flex-col gap-1 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto] sm:items-center sm:gap-4 sm:px-6 lg:grid-cols-[auto_1fr_2fr_auto_1.5fr_1fr_1fr_1fr_auto]',
              isSelected(contact.id) && 'bg-primary/5'
            )}
          >
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected(contact.id)}
                onChange={() => toggle(contact.id)}
                aria-label={`Select ${contact.name}`}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
            <div className="text-sm font-mono text-muted-foreground">
              {contact.contactNumber || '-'}
            </div>
            <div>
              <p className="text-sm font-medium">{contact.name}</p>
              {(contact.firstName || contact.lastName) && (
                <p className="text-xs text-muted-foreground">
                  {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
                </p>
              )}
              {/* Show email inline on mobile */}
              {contact.email && (
                <p className="text-xs text-muted-foreground lg:hidden">{contact.email}</p>
              )}
            </div>
            <div>
              <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', CONTACT_TYPE_STYLES[contact.type as keyof typeof CONTACT_TYPE_STYLES] || '')}>
                {translations.typeLabels[contact.type] || contact.type}
              </span>
            </div>
            <div className="hidden truncate text-sm text-muted-foreground lg:block">{contact.email || '-'}</div>
            <div className="hidden text-sm text-muted-foreground lg:block">{contact.phone || contact.mobile || '-'}</div>
            <div className="hidden text-sm text-muted-foreground lg:block">{contact.city || '-'}</div>
            <div className="hidden text-sm text-muted-foreground lg:block">
              {contact.lastDocumentAt ? formatDate(contact.lastDocumentAt) : '-'}
            </div>
            <div>
              <span
                className={cn(
                  'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                  contact.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                )}
              >
                {contact.isActive ? translations.columnLabels.active : translations.columnLabels.inactive}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk action toolbar */}
      <BulkActionToolbar
        count={count}
        selectedLabel={translations.bulkLabels.selected}
        clearLabel={translations.bulkLabels.clearSelection}
        onClear={clear}
      >
        <button
          onClick={() => executeAction('deactivate')}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {translations.bulkLabels.deactivate}
        </button>
        <button
          onClick={() => executeAction('delete')}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {translations.bulkLabels.delete}
        </button>
      </BulkActionToolbar>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div
          ref={confirmRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onKeyDown={(e) => { if (e.key === 'Escape') setConfirmAction(null); }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold">{translations.bulkLabels.confirmTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {(confirmAction === 'delete' ? translations.bulkLabels.confirmDelete : translations.bulkLabels.confirmDeactivate)
                .replace('{count}', String(selectedIds.length))}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {translations.bulkLabels.cancel}
              </button>
              <button
                onClick={() => executeAction(confirmAction)}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? translations.bulkLabels.processing : translations.bulkLabels.confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
