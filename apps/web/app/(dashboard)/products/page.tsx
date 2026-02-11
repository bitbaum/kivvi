import Link from 'next/link';
import { Plus, Search, Package, Wrench } from 'lucide-react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { listProducts } from '@kivvi/core';
import { formatCurrency } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  product: 'Product',
  service: 'Service',
};

const UNIT_LABELS: Record<string, string> = {
  piece: 'pc',
  hour: 'h',
  kg: 'kg',
  m: 'm',
  m2: 'm\u00B2',
  m3: 'm\u00B3',
  liter: 'l',
};

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

  const params = await searchParams;
  const search = params.search || '';
  const typeFilter = params.type as 'product' | 'service' | undefined;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  const result = await listProducts(db, session.user.companyId, {
    search: search || undefined,
    type: typeFilter || undefined,
    page,
    pageSize: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your products and services.
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <form className="relative flex-1" action="/products" method="GET">
          {typeFilter && (
            <input type="hidden" name="type" value={typeFilter} />
          )}
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder="Search by name, article number, SKU, or EAN..."
            defaultValue={search}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </form>

        {/* Type filter */}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <TypeFilterLink
            href={buildFilterUrl({ search, type: undefined })}
            active={!typeFilter}
            label="All"
          />
          <TypeFilterLink
            href={buildFilterUrl({ search, type: 'product' })}
            active={typeFilter === 'product'}
            label="Products"
          />
          <TypeFilterLink
            href={buildFilterUrl({ search, type: 'service' })}
            active={typeFilter === 'service'}
            label="Services"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No products found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? 'Try a different search term.'
                : 'Get started by adding your first product.'}
            </p>
            {!search && (
              <Link
                href="/products/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                New Product
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Article Number
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Name
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Type
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                      Unit Price
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                      VAT
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                      Stock
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.data.map((product) => (
                    <tr
                      key={product.id}
                      className="group transition-colors hover:bg-muted/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/products/${product.id}`}
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          {product.articleNumber || '-'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/products/${product.id}`}
                          className="font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          {product.type === 'product' ? (
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {TYPE_LABELS[product.type]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                        {formatCurrency(
                          parseFloat(product.unitPrice),
                          product.currency || 'CHF'
                        )}
                        <span className="ml-1 text-xs text-muted-foreground">
                          /{UNIT_LABELS[product.unit || 'piece'] || product.unit}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {product.vatRate}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {product.type === 'product' ? (
                          <StockBadge
                            quantity={parseFloat(product.stockQuantity || '0')}
                            minStock={product.minStock}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={
                            product.isActive
                              ? 'inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing {(result.page - 1) * result.pageSize + 1} to{' '}
                  {Math.min(result.page * result.pageSize, result.total)} of{' '}
                  {result.total} results
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
                      Previous
                    </Link>
                  )}
                  <span className="px-2 text-sm text-muted-foreground">
                    Page {result.page} of {result.totalPages}
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
                      Next
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

function StockBadge({
  quantity,
  minStock,
}: {
  quantity: number;
  minStock: number | null;
}) {
  const isLow = minStock !== null && quantity <= minStock && quantity > 0;
  const isOut = quantity <= 0;

  if (isOut) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Out of stock
      </span>
    );
  }

  if (isLow) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        {quantity} (low)
      </span>
    );
  }

  return <span className="text-sm">{quantity}</span>;
}

// ============================================================================
// URL BUILDER
// ============================================================================

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
