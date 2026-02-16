import { FileText, Plus, Search, Filter, Download } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listDocuments } from '@kivvi/core';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toCamelCase, DEFAULT_PAGE_SIZE } from '@/lib/config/document-types';
import { getTranslations } from 'next-intl/server';
import type { DocumentStatus } from '@kivvi/database';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delivered: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partially_paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  dunning_1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  dunning_2: 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300',
  dunning_3: 'bg-red-300 text-red-900 dark:bg-red-900/50 dark:text-red-200',
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('documents');
  const tc = await getTranslations('common');
  const ts = await getTranslations('status');

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const status = params.status as DocumentStatus | undefined;
  const search = params.search;

  const result = await listDocuments(db, session.user.companyId, {
    type: 'invoice',
    status,
    search,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: 'issueDate',
    sortOrder: 'desc',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('invoicePlural')}</h1>
          <p className="text-muted-foreground">
            {t('manageAndTrack', { type: t('invoicePlural') })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export/invoices"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <Link
            href="/sales/invoices/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t('newDocument', { type: t('invoice') })}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="search"
            type="text"
            placeholder={t('searchDocuments', { type: t('invoicePlural') })}
            defaultValue={search}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>

        <div className="flex gap-2">
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((s) => {
            const isActive = s === 'all' ? !status : status === s;
            const href = s === 'all'
              ? `/sales/invoices${search ? `?search=${search}` : ''}`
              : `/sales/invoices?status=${s}${search ? `&search=${search}` : ''}`;
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
            <p className="text-lg font-medium">{t('noDocumentsFound', { type: t('invoicePlural') })}</p>
            <p className="mt-1 text-sm">
              {search || status
                ? t('adjustFilters')
                : t('createFirst', { type: t('invoice') })}
            </p>
            {!search && !status && (
              <Link
                href="/sales/invoices/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {t('newDocument', { type: t('invoice') })}
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden border-b px-4 py-3 text-sm font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_1.5fr_auto_auto_auto]">
              <span>{t('invoice')}</span>
              <span>{t('customer')}</span>
              <span className="text-right">{tc('total')}</span>
              <span className="px-4 text-center">{tc('status')}</span>
              <span className="text-right">{tc('date')}</span>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {result.data.map((doc) => {
                const isOverdue = doc.status !== 'paid' && doc.status !== 'cancelled' &&
                  doc.dueDate && new Date(doc.dueDate) < new Date();
                return (
                  <Link
                    key={doc.id}
                    href={`/sales/invoices/${doc.id}`}
                    className="flex flex-col gap-1 p-4 hover:bg-muted/50 sm:grid sm:grid-cols-[1fr_1.5fr_auto_auto_auto] sm:items-center sm:gap-4"
                  >
                    <div>
                      <span className="font-medium">{doc.number}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {doc.contact?.name || t('noCustomer')}
                    </div>
                    <div className="text-right font-medium">
                      {formatCurrency(Number(doc.total))}
                    </div>
                    <div className="px-4 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isOverdue && doc.status !== 'overdue'
                            ? statusStyles.overdue
                            : statusStyles[doc.status] || statusStyles.draft
                        }`}
                      >
                        {isOverdue && doc.status !== 'overdue'
                          ? ts('overdue')
                          : ts(toCamelCase(doc.status))}
                      </span>
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
                href={`/sales/invoices?page=${result.page - 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {tc('previous')}
              </Link>
            )}
            {result.page < result.totalPages && (
              <Link
                href={`/sales/invoices?page=${result.page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
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
