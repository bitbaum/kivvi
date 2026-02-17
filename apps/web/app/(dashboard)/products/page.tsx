import Link from 'next/link';
import { Plus, Search, Package, Download } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { listProducts } from '@kivvi/core';
import { DEFAULT_PAGE_SIZE } from '@/lib/config/document-types';
import { SelectableProductTable } from '@/components/products/selectable-product-table';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    page?: string;
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

  const result = await listProducts(db, session.user.companyId, {
    search: search || undefined,
    type: typeFilter || undefined,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: 'createdAt',
    sortOrder: 'desc',
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
            Export CSV
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
        <form className="relative flex-1" action="/products" method="GET">
          {typeFilter && (
            <input type="hidden" name="type" value={typeFilter} />
          )}
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder={t('searchProducts')}
            defaultValue={search}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </form>

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
            />

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {tc('showing', {
                    from: (result.page - 1) * result.pageSize + 1,
                    to: Math.min(result.page * result.pageSize, result.total),
                    total: result.total,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  {result.page > 1 && (
                    <Link
                      href={buildFilterUrl({
                        search,
                        type: typeFilter,
                        page: result.page - 1,
                      })}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      {tc('previous')}
                    </Link>
                  )}
                  <span className="px-2 text-sm text-muted-foreground">
                    {tc('pageOf', { page: result.page, totalPages: result.totalPages })}
                  </span>
                  {result.page < result.totalPages && (
                    <Link
                      href={buildFilterUrl({
                        search,
                        type: typeFilter,
                        page: result.page + 1,
                      })}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      {tc('next')}
                    </Link>
                  )}
                </div>
              </div>
            )}
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

function buildFilterUrl(params: {
  search?: string;
  type?: string;
  page?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.type) searchParams.set('type', params.type);
  if (params.page && params.page > 1) searchParams.set('page', String(params.page));
  const qs = searchParams.toString();
  return `/products${qs ? `?${qs}` : ''}`;
}
