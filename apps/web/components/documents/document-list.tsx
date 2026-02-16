import { FileText, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from './status-badge';
import type { DocumentTypeConfig } from '@/lib/config/document-types';
import { getFilterStatuses, toCamelCase } from '@/lib/config/document-types';
import type { PaginatedResult } from '@kivvi/core';

interface DocumentListProps {
  config: DocumentTypeConfig;
  result: PaginatedResult<any>;
  search?: string;
  status?: string;
}

export async function DocumentList({ config, result, search, status }: DocumentListProps) {
  const t = await getTranslations('documents');
  const ts = await getTranslations('status');
  const tc = await getTranslations('common');
  const filterStatuses = getFilterStatuses(config.type);

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
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
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
          <>
            <div className="hidden border-b px-4 py-3 text-sm font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_1.5fr_auto_auto_auto]">
              <span>{tc('number')}</span>
              <span>{config.contactFilter === 'vendor' ? t('vendor') : t('customer')}</span>
              <span className="text-right">{tc('total')}</span>
              <span className="px-4 text-center">{tc('status')}</span>
              <span className="text-right">{tc('date')}</span>
            </div>

            <div className="divide-y">
              {result.data.map((doc: any) => {
                const isOverdue = config.hasPayments && doc.status !== 'paid' &&
                  doc.status !== 'cancelled' && doc.dueDate && new Date(doc.dueDate) < new Date();
                return (
                  <Link
                    key={doc.id}
                    href={`${config.basePath}/${doc.id}`}
                    className="flex flex-col gap-1 p-4 hover:bg-muted/50 sm:grid sm:grid-cols-[1fr_1.5fr_auto_auto_auto] sm:items-center sm:gap-4"
                  >
                    <div>
                      <span className="font-medium">{doc.number}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {doc.contact?.name || (config.contactFilter === 'vendor' ? t('noVendor') : t('noCustomer'))}
                    </div>
                    <div className="text-right font-medium">
                      {formatCurrency(Number(doc.total))}
                    </div>
                    <div className="px-4 text-center">
                      <StatusBadge status={doc.status} isOverdue={!!isOverdue} />
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {formatDate(doc.issueDate)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
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
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {tc('previous')}
              </Link>
            )}
            {result.page < result.totalPages && (
              <Link
                href={`${config.basePath}?page=${result.page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
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
