import Link from 'next/link';
import { Plus, Package, Download } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { listProducts } from '@kivvi/core';
import { DEFAULT_PAGE_SIZE } from '@/lib/config/document-types';
import { SelectableProductTable } from '@/components/products/selectable-product-table';
import { SearchInput } from '@/components/search-input';
import { Pagination } from '@/components/pagination';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    page?: string;
    sort?: string;
    order?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const t = await getTranslations('products');
  const tc = await getTranslations('common');
  const tb = await getTranslations('bulkActions');

  const params = await searchParams;
  const search = params.search || '';
  const typeFilter = params.type as 'product' | 'service' | undefined;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const sort = (params.sort || 'createdAt') as 'name' | 'articleNumber' | 'unitPrice' | 'createdAt';
  const order = (params.order || 'desc') as 'asc' | 'desc';

  const result = await listProducts(db, session.user.companyId, {
    search: search || undefined,
    type: typeFilter || undefined,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: sort,
    sortOrder: order,
  });

  // Pre-resolve translations for client component
  const bulkActionKeys = [
    'selected', 'clearSelection', 'delete', 'deactivate',
    'confirmTitle', 'confirmDelete', 'confirmDeactivate',
    'cancel', 'processing', 'confirmAction',
    'successAll', 'successPartial', 'failedAll',
    'showErrors', 'hideErrors',
  ];
  const bulkLabels: Record<string, string> = {};
  for (const key of bulkActionKeys) {
    bulkLabels[key] = tb(key);
  }

  const columnLabels = {
    articleNumber: t('articleNumber'),
    name: tc('name'),
    type: tc('type'),
    unitPrice: t('unitPrice'),
    vatRate: t('vatRate'),
    stock: t('stock'),
    status: tc('status'),
    active: tc('active'),
    inactive: tc('inactive'),
    sku: t('sku'),
    outOfStock: t('outOfStock'),
    lowStock: t('lowStock'),
  };

  const typeLabels: Record<string, string> = {
    product: t('product'),
    service: t('service'),
  };

  function buildFilterUrl(overrides: {
    search?: string;
    type?: string;
    page?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (overrides.search) searchParams.set('search', overrides.search);
    if (overrides.type) searchParams.set('type', overrides.type);
    if (sort !== 'createdAt') searchParams.set('sort', sort);
    if (order !== 'desc') searchParams.set('order', order);
    if (overrides.page && overrides.page > 1) searchParams.set('page', String(overrides.page));
    const qs = searchParams.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  }

  function buildPageUrl(p: number): string {
    const searchParams = new URLSearchParams();
    if (search) searchParams.set('search', search);
    if (typeFilter) searchParams.set('type', typeFilter);
    if (sort !== 'createdAt') searchParams.set('sort', sort);
    if (order !== 'desc') searchParams.set('order', order);
    if (p > 1) searchParams.set('page', p.toString());
    const qs = searchParams.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  }

  function buildSortUrl(s: string, o: 'asc' | 'desc'): string {
    const searchParams = new URLSearchParams();
    if (search) searchParams.set('search', search);
    if (typeFilter) searchParams.set('type', typeFilter);
    searchParams.set('sort', s);
    searchParams.set('order', o);
    return `/products?${searchParams.toString()}`;
  }

  // Pre-compute sort hrefs for client component (functions can't cross server→client boundary)
  const sortHrefs: Record<string, string> = {};
  for (const field of ['articleNumber', 'name', 'unitPrice']) {
    const nextOrder = sort === field && order === 'asc' ? 'desc' : 'asc';
    sortHrefs[field] = buildSortUrl(field, nextOrder);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export/products"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4" />
            {tc('exportCsv')}
          </a>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('newProduct')}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchInput
          basePath="/products"
          placeholder={t('searchProducts')}
          preserveParams={['type', 'sort', 'order']}
        />

        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <TypeFilterLink
            href={buildFilterUrl({ search, type: undefined })}
            active={!typeFilter}
            label={tc('all')}
          />
          <TypeFilterLink
            href={buildFilterUrl({ search, type: 'product' })}
            active={typeFilter === 'product'}
            label={t('product')}
          />
          <TypeFilterLink
            href={buildFilterUrl({ search, type: 'service' })}
            active={typeFilter === 'service'}
            label={t('service')}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{t('noProducts')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? tc('noResults')
                : t('createFirstProduct')}
            </p>
            {!search && (
              <Link
                href="/products/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {t('newProduct')}
              </Link>
            )}
          </div>
        ) : (
          <>
            <SelectableProductTable
              data={result.data.map((p) => ({
                id: p.id,
                articleNumber: p.articleNumber,
                name: p.name,
                sku: p.sku,
                type: p.type,
                unitPrice: p.unitPrice,
                currency: p.currency,
                unit: p.unit,
                vatRate: p.vatRate,
                stockQuantity: p.stockQuantity,
                minStock: p.minStock,
                isActive: p.isActive,
              }))}
              translations={{ columnLabels, typeLabels, bulkLabels }}
              sort={{ field: sort, order, hrefs: sortHrefs }}
            />

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
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function TypeFilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm'
          : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground'
      }
    >
      {label}
    </Link>
  );
}
