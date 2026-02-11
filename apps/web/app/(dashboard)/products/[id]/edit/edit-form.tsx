'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { updateProductAction } from '@/app/actions/products';
import type { Product } from '@kivvi/database';

const VAT_RATE_OPTIONS = [
  { value: '8.1', label: '8.1% (Standard)' },
  { value: '2.6', label: '2.6% (Reduced)' },
  { value: '0', label: '0% (Exempt)' },
];

const UNIT_OPTIONS = [
  { value: 'piece', label: 'Piece' },
  { value: 'hour', label: 'Hour' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'm', label: 'Meter' },
  { value: 'm2', label: 'Square Meter' },
  { value: 'm3', label: 'Cubic Meter' },
  { value: 'liter', label: 'Liter' },
];

const TYPE_OPTIONS = [
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
];

interface EditProductFormProps {
  product: Product;
}

export function EditProductForm({ product }: EditProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productType, setProductType] = useState(product.type);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateProductAction(product.id, formData);

      if (result.success) {
        router.push(`/products/${product.id}`);
      } else {
        setError(result.error || 'Failed to update product');
        setIsSubmitting(false);
      }
    } catch {
      setError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/products/${product.id}`}
          className="rounded-lg border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Product</h1>
          <p className="text-muted-foreground">
            Update {product.name}
            {product.articleNumber ? ` (${product.articleNumber})` : ''}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Basic Information</h2>
          </div>
          <div className="space-y-4 p-6">
            <div>
              <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
                Type <span className="text-destructive">*</span>
              </label>
              <select
                id="type"
                name="type"
                required
                value={productType}
                onChange={(e) => setProductType(e.target.value as 'product' | 'service')}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                maxLength={255}
                defaultValue={product.name}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={5000}
                defaultValue={product.description || ''}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sku" className="mb-1.5 block text-sm font-medium">SKU</label>
                <input type="text" id="sku" name="sku" maxLength={100} defaultValue={product.sku || ''} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label htmlFor="ean" className="mb-1.5 block text-sm font-medium">EAN / Barcode</label>
                <input type="text" id="ean" name="ean" maxLength={50} defaultValue={product.ean || ''} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Pricing</h2>
          </div>
          <div className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="unitPrice" className="mb-1.5 block text-sm font-medium">
                  Unit Price (CHF) <span className="text-destructive">*</span>
                </label>
                <input type="text" id="unitPrice" name="unitPrice" required defaultValue={product.unitPrice} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label htmlFor="purchasePrice" className="mb-1.5 block text-sm font-medium">Purchase Price (CHF)</label>
                <input type="text" id="purchasePrice" name="purchasePrice" defaultValue={product.purchasePrice || ''} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
            </div>

            <input type="hidden" name="currency" value={product.currency || 'CHF'} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="vatRate" className="mb-1.5 block text-sm font-medium">
                  VAT Rate <span className="text-destructive">*</span>
                </label>
                <select id="vatRate" name="vatRate" required defaultValue={product.vatRate || '8.1'} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {VAT_RATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="unit" className="mb-1.5 block text-sm font-medium">Unit</label>
                <select id="unit" name="unit" defaultValue={product.unit || 'piece'} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory (only for products) */}
        {productType === 'product' && (
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">Inventory</h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="max-w-xs">
                <label htmlFor="minStock" className="mb-1.5 block text-sm font-medium">Minimum Stock (Reorder Point)</label>
                <input type="number" id="minStock" name="minStock" min={0} step={1} defaultValue={product.minStock ?? ''} className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="serialNumberTracking" name="serialNumberTracking" defaultChecked={product.serialNumberTracking ?? false} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                <label htmlFor="serialNumberTracking" className="text-sm font-medium">Enable serial number tracking</label>
              </div>
            </div>
          </div>
        )}

        {/* Visibility */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Visibility</h2>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="shopVisible" name="shopVisible" defaultChecked={product.shopVisible ?? false} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <div>
                <label htmlFor="shopVisible" className="text-sm font-medium">Visible in shop</label>
                <p className="text-xs text-muted-foreground">Make this product available in the online shop.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/products/${product.id}`} className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
