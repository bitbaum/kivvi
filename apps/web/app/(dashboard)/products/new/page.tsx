'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createProductAction } from '@/app/actions/products';
import { SWISS_VAT_RATES, DEFAULT_VAT_RATE } from '@/lib/config/vat-rates';
import { cn } from '@/lib/utils';

export default function NewProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productType, setProductType] = useState('product');

  const t = useTranslations('products');
  const tc = useTranslations('common');

  const VAT_RATE_OPTIONS = SWISS_VAT_RATES.map((rate) => ({
    value: rate.value,
    label: t(`vatRates.${rate.labelKey}`),
  }));

  const UNIT_OPTIONS = [
    { value: 'piece', label: t('units.piece') },
    { value: 'hour', label: t('units.hour') },
    { value: 'kg', label: t('units.kg') },
    { value: 'm', label: t('units.m') },
    { value: 'm2', label: t('units.m2') },
    { value: 'm3', label: t('units.m3') },
    { value: 'liter', label: t('units.liter') },
  ];

  const TYPE_OPTIONS = [
    { value: 'product', label: t('product') },
    { value: 'service', label: t('service') },
  ];

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createProductAction(formData);

      if (result.success && result.data) {
        router.push(`/products/${result.data.id}`);
      } else {
        setError(result.error || tc('error'));
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(tc('error'));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="rounded-lg border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('newProduct')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Form */}
      <form action={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('basicInformation')}</h2>
          </div>
          <div className="space-y-4 p-6">
            {/* Type */}
            <div>
              <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
                {tc('type')} <span className="text-destructive">*</span>
              </label>
              <select
                id="type"
                name="type"
                required
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                {tc('name')} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                maxLength={255}
                placeholder={tc('name')}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-sm font-medium"
              >
                {tc('description')}
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={5000}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* SKU & EAN */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sku" className="mb-1.5 block text-sm font-medium">
                  {t('sku')}
                </label>
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  maxLength={100}
                  placeholder="e.g. WIDGET-001"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="ean" className="mb-1.5 block text-sm font-medium">
                  {t('ean')}
                </label>
                <input
                  type="text"
                  id="ean"
                  name="ean"
                  maxLength={50}
                  placeholder="e.g. 7610000000001"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('pricing')}</h2>
          </div>
          <div className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Unit Price */}
              <div>
                <label
                  htmlFor="unitPrice"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t('unitPrice')} (CHF) <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="unitPrice"
                  name="unitPrice"
                  required
                  placeholder="0.00"
                  pattern="\d+(\.\d{1,2})?"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Purchase Price */}
              <div>
                <label
                  htmlFor="purchasePrice"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t('purchasePrice')} (CHF)
                </label>
                <input
                  type="text"
                  id="purchasePrice"
                  name="purchasePrice"
                  placeholder="0.00"
                  pattern="\d+(\.\d{1,2})?"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Hidden currency */}
            <input type="hidden" name="currency" value="CHF" />

            <div className="grid gap-4 sm:grid-cols-2">
              {/* VAT Rate */}
              <div>
                <label
                  htmlFor="vatRate"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t('vatRate')} <span className="text-destructive">*</span>
                </label>
                <select
                  id="vatRate"
                  name="vatRate"
                  required
                  defaultValue={DEFAULT_VAT_RATE}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {VAT_RATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label
                  htmlFor="unit"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t('unit')}
                </label>
                <select
                  id="unit"
                  name="unit"
                  defaultValue="piece"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
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
              <h2 className="font-semibold">{t('inventorySection')}</h2>
            </div>
            <div className="space-y-4 p-6">
              {/* Min Stock */}
              <div className="max-w-xs">
                <label
                  htmlFor="minStock"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t('minStock')}
                </label>
                <input
                  type="number"
                  id="minStock"
                  name="minStock"
                  min={0}
                  step={1}
                  placeholder="0"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Serial Number Tracking */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="serialNumberTracking"
                  name="serialNumberTracking"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="serialNumberTracking"
                  className="text-sm font-medium"
                >
                  {t('serialNumberTracking')}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Visibility */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('visibility')}</h2>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="shopVisible"
                name="shopVisible"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <label htmlFor="shopVisible" className="text-sm font-medium">
                  {t('visibleInShop')}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('shopVisibleDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{tc('notes')}</h2>
          </div>
          <div className="p-6">
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={5000}
              placeholder={t('internalNotes')}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/products"
            className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {tc('cancel')}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors',
              isSubmitting
                ? 'cursor-not-allowed opacity-70'
                : 'hover:bg-primary/90'
            )}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? tc('creating') : t('createProduct')}
          </button>
        </div>
      </form>
    </div>
  );
}
