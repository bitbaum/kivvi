import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listDocuments } from '@kivvi/core';
import { DOCUMENT_TYPES, DEFAULT_PAGE_SIZE, toCamelCase, STATUS_STYLES } from '@/lib/config/document-types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/search-input';
import { Pagination } from '@/components/pagination';
import { SortableHeader } from '@/components/sortable-header';
import type { DocumentType, DocumentStatus } from '@kivvi/database';

/** Document types shown as tabs — grouped as outgoing vs incoming */
const OUTGOING_TYPES: DocumentType[] = ['quote', 'order', 'invoice', 'delivery_note', 'credit_note', 'dunning'];
const INCOMING_TYPES: DocumentType[] = ['purchase_order', 'purchase_invoice'];
const ALL_TYPES = [...OUTGOING_TYPES, ...INCOMING_TYPES];

interface PageProps {
  searchParams: Promise<{
    type?: string;
    status?: string;
    search?: string;
    page?: string;
    sort?: string;
    order?: string;
  }>;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const params = await searchParams;
  const t = await getTranslations('documentsHub');
  const td = await getTranslations('documents');
  const ts = await getTranslations('status');
  const tc = await getTranslations('common');

  const selectedType = params.type as DocumentType | undefined;
  const status = params.status as DocumentStatus | undefined;
  const search = params.search;
  const page = parseInt(params.page || '1', 10);
  const sort = (params.sort || 'issueDate') as 'number' | 'issueDate' | 'dueDate' | 'total' | 'createdAt';
  const order = (params.order || 'desc') as 'asc' | 'desc';

  const result = await listDocuments(db, session.user.companyId, {
    type: selectedType,
    status,
    search,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: sort,
    sortOrder: order,
  });

  // Build query string helper
  function buildHref(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { type: selectedType, status, search, sort: sort !== 'issueDate' ? sort : undefined, order: order !== 'desc' ? order : undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/documents${qs ? `?${qs}` : ''}`;
  }

  function buildPageUrl(p: number): string {
    return buildHref({ page: p > 1 ? String(p) : undefined });
  }

  function buildSortUrl(s: string, o: 'asc' | 'desc'): string {
    const p = new URLSearchParams();
    if (selectedType) p.set('type', selectedType);
    if (status) p.set('status', status);
    if (search) p.set('search', search);
    p.set('sort', s);
    p.set('order', o);
    return `/documents?${p.toString()}`;
  }

  // Creatable types for the "New" dropdown
  const creatableTypes = ALL_TYPES.filter((t) => DOCUMENT_TYPES[t].canCreate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="relative group">
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            {t('newDocument')}
          </button>
          <div className="absolute right-0 top-full z-10 mt-1 hidden w-56 rounded-lg border bg-popover p-1 shadow-lg group-focus-within:block hover:block">
            {creatableTypes.map((type) => (
              <Link
                key={type}
                href={`${DOCUMENT_TYPES[type].basePath}/new`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                {td(DOCUMENT_TYPES[type].label)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/documents"
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            !selectedType
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {t('allDocuments')}
        </Link>
        <span className="mx-1 text-muted-foreground/40">|</span>
        {OUTGOING_TYPES.map((type) => (
          <Link
            key={type}
            href={buildHref({ type, status: undefined, page: undefined })}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              selectedType === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {td(DOCUMENT_TYPES[type].labelPlural)}
          </Link>
        ))}
        <span className="mx-1 text-muted-foreground/40">|</span>
        {INCOMING_TYPES.map((type) => (
          <Link
            key={type}
            href={buildHref({ type, status: undefined, page: undefined })}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              selectedType === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {td(DOCUMENT_TYPES[type].labelPlural)}
          </Link>
        ))}
      </div>

      {/* Search + Status filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          basePath="/documents"
          placeholder={`${tc('search')}...`}
          preserveParams={['type', 'status', 'sort', 'order']}
        />

        <div className="flex gap-2">
          <Link
            href={buildHref({ status: undefined, page: undefined })}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              !status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {tc('all')}
          </Link>
          {['draft', 'sent', 'confirmed', 'paid', 'overdue', 'cancelled'].map((s) => (
            <Link
              key={s}
              href={buildHref({ status: s, page: undefined })}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                status === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {ts(toCamelCase(s))}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10" />
            <p className="text-lg font-medium">
              {selectedType
                ? td('noDocumentsFound', { type: td(DOCUMENT_TYPES[selectedType].labelPlural) })
                : td('noDocumentsFound', { type: t('title').toLowerCase() })}
            </p>
            <p className="mt-1 text-sm">
              {search || status ? td('adjustFilters') : td('createFirst', { type: td('invoice') })}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">
                    <SortableHeader label={tc('number')} field="number" currentSort={sort} currentOrder={order} href={buildSortUrl('number', sort === 'number' && order === 'asc' ? 'desc' : 'asc')} />
                  </th>
                  {!selectedType && <th className="px-4 py-3 font-medium">{tc('type')}</th>}
                  <th className="px-4 py-3 font-medium">{td('customer')}</th>
                  <th className="px-4 py-3 font-medium text-right">
                    <SortableHeader label={tc('total')} field="total" currentSort={sort} currentOrder={order} href={buildSortUrl('total', sort === 'total' && order === 'asc' ? 'desc' : 'asc')} />
                  </th>
                  <th className="px-4 py-3 font-medium">{tc('status')}</th>
                  <th className="px-4 py-3 font-medium">
                    <SortableHeader label={tc('date')} field="issueDate" currentSort={sort} currentOrder={order} href={buildSortUrl('issueDate', sort === 'issueDate' && order === 'asc' ? 'desc' : 'asc')} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((doc) => {
                  const typeConfig = DOCUMENT_TYPES[doc.type];
                  const detailHref = `${typeConfig.basePath}/${doc.id}`;
                  return (
                    <tr key={doc.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={detailHref} className="font-medium text-primary hover:underline">
                          {doc.number}
                        </Link>
                      </td>
                      {!selectedType && (
                        <td className="px-4 py-3 text-muted-foreground">
                          {td(typeConfig.label)}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {(doc as { contact?: { name: string } | null }).contact?.name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {doc.total ? formatCurrency(Number(doc.total)) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                            STATUS_STYLES[doc.status] || 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {ts(toCamelCase(doc.status))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(doc.issueDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        buildHref={buildPageUrl}
        labels={{
          showing: tc('showing', {
            from: (result.page - 1) * result.pageSize + 1,
            to: Math.min(result.page * result.pageSize, result.total),
            total: result.total,
          }),
          previous: tc('previous'),
          next: tc('next'),
          pageOf: tc('pageOf', { page: result.page, totalPages: result.totalPages }),
        }}
      />
    </div>
  );
}
