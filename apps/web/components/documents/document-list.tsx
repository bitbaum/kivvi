import { FileText, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { DocumentTypeConfig } from '@/lib/config/document-types';
import { getFilterStatuses, toCamelCase } from '@/lib/config/document-types';
import type { PaginatedResult } from '@kivvi/core';
import type { DocumentListItem } from '@kivvi/core/src/domain/documents';
import { SelectableDocumentTable } from './selectable-document-table';
import { cn } from '@/lib/utils';

interface DocumentListProps {
  config: DocumentTypeConfig;
  result: PaginatedResult<DocumentListItem>;
  search?: string;
  status?: string;
  headerActions?: React.ReactNode;
}

export async function DocumentList({ config, result, search, status, headerActions }: DocumentListProps) {
  const t = await getTranslations('documents');
  const ts = await getTranslations('status');
  const tc = await getTranslations('common');
  const tb = await getTranslations('bulkActions');
  const filterStatuses = getFilterStatuses(config.type);

  // Pre-resolve translations for the client component
  const allStatuses = ['draft', 'sent', 'confirmed', 'delivered', 'paid', 'partiallyPaid', 'overdue', 'cancelled', 'dunning1', 'dunning2', 'dunning3'];
  const statusLabels: Record<string, string> = {};
  for (const s of allStatuses) {
    statusLabels[s] = ts(s);
  }

  // Pre-resolve bulk action labels
  const bulkActionKeys = [
    'selected', 'clearSelection', 'convertToOrder', 'convertToInvoice',
    'convertToDeliveryNote', 'convertToCreditNote', 'convertToPurchaseInvoice',
    'extendValidity', 'markAsSent', 'markDelivered', 'confirm', 'delete',
    'days', 'confirmTitle', 'confirmMessage', 'cancel', 'processing',
    'confirmAction', 'successAll', 'successPartial', 'failedAll',
    'showErrors', 'hideErrors',
  ];
  // Keys with ICU placeholders ({count}, {action}, etc.) must use
  // tb.raw() to avoid ICU parser errors — the client fills them via .replace()
  const rawKeys = new Set([
    'successAll', 'successPartial', 'failedAll', 'confirmMessage',
  ]);
  const bulkLabels: Record<string, string> = {};
  for (const key of bulkActionKeys) {
    bulkLabels[key] = rawKeys.has(key) ? tb.raw(key) : tb(key);
  }

  const columnLabels = {
    number: tc('number'),
    contact: config.contactFilter === 'vendor' ? t('vendor') : t('customer'),
    total: tc('total'),
    status: tc('status'),
    date: tc('date'),
    noContact: config.contactFilter === 'vendor' ? t('noVendor') : t('noCustomer'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t(config.labelPlural)}</h1>
          <p className="text-muted-foreground">
            {t('manageAndTrack', { type: t(config.labelPlural) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          {config.canCreate && (
            <Link
              href={`${config.basePath}/new`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {t('newDocument', { type: t(config.label) })}
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="search"
            type="text"
            placeholder={t('searchDocuments', { type: t(config.labelPlural) })}
            defaultValue={search}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>

        <div className="flex gap-2">
          {filterStatuses.map((s) => {
            const isActive = s === 'all' ? !status : status === s;
            const href = s === 'all'
              ? `${config.basePath}${search ? `?search=${search}` : ''}`
              : `${config.basePath}?status=${s}${search ? `&search=${search}` : ''}`;
            return (
              <Link
                key={s}
                href={href}
                className={cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px] inline-flex items-center', isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80')}
              >
                {s === 'all' ? tc('all') : ts(toCamelCase(s))}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10" />
            <p className="text-lg font-medium">{t('noDocumentsFound', { type: t(config.labelPlural) })}</p>
            <p className="mt-1 text-sm">
              {search || status
                ? t('adjustFilters')
                : t('createFirst', { type: t(config.label) })}
            </p>
            {!search && !status && config.canCreate && (
              <Link
                href={`${config.basePath}/new`}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {t('newDocument', { type: t(config.label) })}
              </Link>
            )}
          </div>
        ) : (
          <SelectableDocumentTable
            config={config}
            data={result.data.map((doc) => ({
              id: doc.id,
              number: doc.number,
              status: doc.status,
              total: doc.total,
              issueDate: doc.issueDate,
              dueDate: doc.dueDate,
              contact: doc.contact,
            }))}
            translations={{ statusLabels, columnLabels, bulkLabels }}
          />
        )}
      </div>

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tc('showing', {
              from: (result.page - 1) * result.pageSize + 1,
              to: Math.min(result.page * result.pageSize, result.total),
              total: result.total,
            })}
          </p>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`${config.basePath}?page=${result.page - 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
                className="inline-flex min-h-[44px] items-center rounded-lg border px-3 py-2 text-sm hover:bg-muted"
              >
                {tc('previous')}
              </Link>
            )}
            {result.page < result.totalPages && (
              <Link
                href={`${config.basePath}?page=${result.page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
                className="inline-flex min-h-[44px] items-center rounded-lg border px-3 py-2 text-sm hover:bg-muted"
              >
                {tc('next')}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
