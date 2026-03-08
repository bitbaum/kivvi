'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createProductAction, updateProductAction } from '@/app/actions/products';
import { SWISS_VAT_RATES, DEFAULT_VAT_RATE } from '@/lib/config/vat-rates';
import { PRODUCT_TYPES, UNIT_VALUES } from '@/lib/config/products';
import type { Product } from '@kivvi/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';

interface ProductFormProps {
  mode: 'create' | 'edit';
  product?: Product;
}

export function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productType, setProductType] = useState(product?.type || 'product');

  const t = useTranslations('products');
  const tc = useTranslations('common');

  const isEdit = mode === 'edit';

  const vatRateOptions = SWISS_VAT_RATES.map((rate) => ({
    value: rate.value,
    label: t(`vatRates.${rate.labelKey}`),
  }));

  const unitOptions = UNIT_VALUES.map((u) => ({ value: u, label: t(`units.${u}`) }));
  const typeOptions = PRODUCT_TYPES.map((pt) => ({ value: pt, label: t(pt) }));

  const backHref = isEdit ? `/products/${product!.id}` : '/products';

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        const result = await updateProductAction(product!.id, formData);
        if (result.success) {
          toast.success(t('updated'));
          router.push(`/products/${product!.id}`);
        } else {
          setError(result.error || tc('error'));
          setIsSubmitting(false);
        }
      } else {
        const result = await createProductAction(formData);
        if (result.success && result.data) {
          toast.success(t('created'));
          router.push(`/products/${result.data.id}`);
        } else {
          setError(result.error || tc('error'));
          setIsSubmitting(false);
        }
      }
    } catch {
      setError(tc('error'));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="rounded-lg border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? t('editProduct') : t('newProduct')}
          </h1>
          <p className="text-muted-foreground">
            {isEdit
              ? `${product!.name}${product!.articleNumber ? ` (${product!.articleNumber})` : ''}`
              : t('subtitle')}
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
              <FormSelect
                id="type"
                name="type"
                required
                value={productType}
                onChange={(e) => setProductType(e.target.value as 'product' | 'service')}
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FormSelect>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                {tc('name')} <span className="text-destructive">*</span>
              </label>
              <FormInput
                type="text"
                id="name"
                name="name"
                required
                maxLength={255}
                defaultValue={product?.name || ''}
                placeholder={!isEdit ? tc('name') : undefined}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
                {tc('description')}
              </label>
              <FormTextarea
                id="description"
                name="description"
                rows={3}
                maxLength={5000}
                defaultValue={product?.description || ''}
              />
            </div>

            {/* SKU & EAN */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sku" className="mb-1.5 block text-sm font-medium">
                  {t('sku')}
                </label>
                <FormInput
                  type="text"
                  id="sku"
                  name="sku"
                  maxLength={100}
                  defaultValue={product?.sku || ''}
                  placeholder={!isEdit ? t('placeholders.articleNumber') : undefined}
                />
              </div>
              <div>
                <label htmlFor="ean" className="mb-1.5 block text-sm font-medium">
                  {t('ean')}
                </label>
                <FormInput
                  type="text"
                  id="ean"
                  name="ean"
                  maxLength={50}
                  defaultValue={product?.ean || ''}
                  placeholder={!isEdit ? t('placeholders.ean') : undefined}
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
              <div>
                <label htmlFor="unitPrice" className="mb-1.5 block text-sm font-medium">
                  {t('unitPrice')} (CHF) <span className="text-destructive">*</span>
                </label>
                <FormInput
                  type="text"
                  id="unitPrice"
                  name="unitPrice"
                  required
                  defaultValue={product?.unitPrice || ''}
                  placeholder={!isEdit ? '0.00' : undefined}
                  pattern={!isEdit ? '\\d+(\\.\\d{1,2})?' : undefined}
                />
              </div>
              <div>
                <label htmlFor="purchasePrice" className="mb-1.5 block text-sm font-medium">
                  {t('purchasePrice')} (CHF)
                </label>
                <FormInput
                  type="text"
                  id="purchasePrice"
                  name="purchasePrice"
                  defaultValue={product?.purchasePrice || ''}
                  placeholder={!isEdit ? '0.00' : undefined}
                  pattern={!isEdit ? '\\d+(\\.\\d{1,2})?' : undefined}
                />
              </div>
            </div>

            <input type="hidden" name="currency" value={product?.currency || 'CHF'} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="vatRate" className="mb-1.5 block text-sm font-medium">
                  {t('vatRate')} <span className="text-destructive">*</span>
                </label>
                <FormSelect
                  id="vatRate"
                  name="vatRate"
                  required
                  defaultValue={product?.vatRate || DEFAULT_VAT_RATE}
                >
                  {vatRateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <label htmlFor="unit" className="mb-1.5 block text-sm font-medium">
                  {t('unit')}
                </label>
                <FormSelect id="unit" name="unit" defaultValue={product?.unit || 'piece'}>
                  {unitOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FormSelect>
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
              <div className="max-w-xs">
                <label htmlFor="minStock" className="mb-1.5 block text-sm font-medium">
                  {t('minStock')}
                </label>
                <FormInput
                  type="number"
                  id="minStock"
                  name="minStock"
                  min={0}
                  step={1}
                  defaultValue={product?.minStock ?? ''}
                  placeholder={!isEdit ? '0' : undefined}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="serialNumberTracking"
                  name="serialNumberTracking"
                  defaultChecked={product?.serialNumberTracking ?? false}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="serialNumberTracking" className="text-sm font-medium">
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
                defaultChecked={product?.shopVisible ?? false}
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

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={backHref}
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
            {isSubmitting
              ? isEdit ? tc('saving') : tc('creating')
              : isEdit ? tc('saveChanges') : t('createProduct')}
          </button>
        </div>
      </form>
    </div>
  );
}
