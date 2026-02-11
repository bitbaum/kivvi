import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Package,
  Wrench,
  Warehouse,
  Info,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProduct } from '@kivvi/core';
import { formatCurrency, formatDate } from '@/lib/utils';
import { deleteProductAction } from '@/app/actions/products';

const TYPE_LABELS: Record<string, string> = {
  product: 'Product',
  service: 'Service',
};

const UNIT_LABELS: Record<string, string> = {
  piece: 'Piece',
  hour: 'Hour',
  kg: 'Kilogram',
  m: 'Meter',
  m2: 'Square Meter',
  m3: 'Cubic Meter',
  liter: 'Liter',
};

const VAT_LABELS: Record<string, string> = {
  '8.1': '8.1% (Standard)',
  '2.6': '2.6% (Reduced)',
  '0': '0% (Exempt)',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const { id } = await params;
  const product = await getProduct(db, session.user.companyId, id);

  if (!product) {
    notFound();
  }

  const margin =
    product.purchasePrice && parseFloat(product.purchasePrice) > 0
      ? (
          ((parseFloat(product.unitPrice) - parseFloat(product.purchasePrice)) /
            parseFloat(product.unitPrice)) *
          100
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/products"
            className="mt-1 rounded-lg border p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <span
                className={
                  product.isActive
                    ? 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                }
              >
                {product.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-mono">{product.articleNumber}</span>
              {product.sku && (
                <>
                  <span>-</span>
                  <span>SKU: {product.sku}</span>
                </>
              )}
              {product.ean && (
                <>
                  <span>-</span>
                  <span>EAN: {product.ean}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/products/${product.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <DeleteButton productId={product.id} productName={product.name} />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info — 2 columns */}
        <div className="space-y-6 lg:col-span-2">
          {/* Overview Card */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Overview</h2>
            </div>
            <div className="p-6">
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Type</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-medium">
                    {product.type === 'product' ? (
                      <Package className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                    )}
                    {TYPE_LABELS[product.type]}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">Unit</dt>
                  <dd className="mt-1 font-medium">
                    {UNIT_LABELS[product.unit || 'piece'] || product.unit}
                  </dd>
                </div>

                {product.manufacturer && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Manufacturer</dt>
                    <dd className="mt-1 font-medium">{(product.manufacturer as { name: string }).name}</dd>
                  </div>
                )}

                {product.productGroup && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Product Group</dt>
                    <dd className="mt-1 font-medium">{(product.productGroup as { name: string }).name}</dd>
                  </div>
                )}

                {product.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-muted-foreground">Description</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm">
                      {product.description}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">Pricing</h2>
            </div>
            <div className="p-6">
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Unit Price</dt>
                  <dd className="mt-1 text-2xl font-bold">
                    {formatCurrency(
                      parseFloat(product.unitPrice),
                      product.currency || 'CHF'
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">Purchase Price</dt>
                  <dd className="mt-1 text-2xl font-bold">
                    {product.purchasePrice
                      ? formatCurrency(
                          parseFloat(product.purchasePrice),
                          product.currency || 'CHF'
                        )
                      : '-'}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">Margin</dt>
                  <dd className="mt-1 text-2xl font-bold">
                    {margin ? `${margin}%` : '-'}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">VAT Rate</dt>
                  <dd className="mt-1 font-medium">
                    {VAT_LABELS[product.vatRate || '8.1'] || `${product.vatRate}%`}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-muted-foreground">Currency</dt>
                  <dd className="mt-1 font-medium">{product.currency || 'CHF'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Dimensions Card (only for physical products) */}
          {product.type === 'product' &&
            (product.weight || product.width || product.height || product.depth) && (
              <div className="rounded-xl border bg-card">
                <div className="border-b px-6 py-4">
                  <h2 className="font-semibold">Dimensions & Weight</h2>
                </div>
                <div className="p-6">
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-4">
                    {product.weight && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Weight</dt>
                        <dd className="mt-1 font-medium">{product.weight} kg</dd>
                      </div>
                    )}
                    {product.width && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Width</dt>
                        <dd className="mt-1 font-medium">{product.width} cm</dd>
                      </div>
                    )}
                    {product.height && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Height</dt>
                        <dd className="mt-1 font-medium">{product.height} cm</dd>
                      </div>
                    )}
                    {product.depth && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Depth</dt>
                        <dd className="mt-1 font-medium">{product.depth} cm</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            )}
        </div>

        {/* Sidebar — 1 column */}
        <div className="space-y-6">
          {/* Stock Card (only for products) */}
          {product.type === 'product' && (
            <div className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-6 py-4">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Stock</h2>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Total Stock</p>
                  <p className="text-3xl font-bold">
                    {parseFloat(product.stockQuantity || '0')}
                  </p>
                  {product.minStock !== null && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Min. stock: {product.minStock}
                    </p>
                  )}
                </div>

                {product.stockLevels && product.stockLevels.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Per Warehouse
                    </p>
                    {product.stockLevels.map((sl) => (
                      <div
                        key={sl.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                      >
                        <span className="text-sm">
                          {sl.warehouse?.name || 'Unknown'}
                        </span>
                        <div className="text-right text-sm">
                          <span className="font-medium">
                            {parseFloat(sl.quantity)}
                          </span>
                          {parseFloat(sl.reservedQuantity) > 0 && (
                            <span className="ml-1 text-muted-foreground">
                              ({parseFloat(sl.reservedQuantity)} reserved)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No warehouse stock entries yet.
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  {product.serialNumberTracking && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      Serial Number Tracking
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings Card */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">Settings</h2>
            </div>
            <div className="divide-y">
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">Shop Visible</span>
                <span
                  className={
                    product.shopVisible
                      ? 'inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }
                >
                  {product.shopVisible ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">
                  Serial Number Tracking
                </span>
                <span
                  className={
                    product.serialNumberTracking
                      ? 'inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }
                >
                  {product.serialNumberTracking ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">Metadata</h2>
            </div>
            <div className="divide-y">
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{formatDate(product.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">Updated</span>
                <span className="text-sm">{formatDate(product.updatedAt)}</span>
              </div>
              {product.kivitendoId && (
                <div className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm text-muted-foreground">
                    Kivitendo ID
                  </span>
                  <span className="font-mono text-sm">{product.kivitendoId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DELETE BUTTON (Client Component via form action)
// ============================================================================

function DeleteButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  return (
    <form
      action={async () => {
        'use server';
        const result = await deleteProductAction(productId);
        if (result.success) {
          redirect('/products');
        }
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        title={`Deactivate ${productName}`}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </form>
  );
}
