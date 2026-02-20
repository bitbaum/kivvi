'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { updateCompanyAction } from '@/app/actions/settings';
import { cn } from '@/lib/utils';
import { COUNTRY_OPTIONS } from '@/lib/config/locales';
import { FormInput, FormSelect } from '@/components/ui/form-field';

const CURRENCIES = [
  { value: 'CHF', label: 'CHF - Swiss Franc' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - US Dollar' },
] as const;

interface CompanyFormProps {
  initialData: {
    name: string;
    legalName: string;
    vatNumber: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    currency: string;
  };
}

export function CompanyForm({ initialData }: CompanyFormProps) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData(e.currentTarget);
      const input = {
        name: formData.get('name') as string,
        legalName: (formData.get('legalName') as string) || null,
        vatNumber: (formData.get('vatNumber') as string) || null,
        address: (formData.get('address') as string) || null,
        city: (formData.get('city') as string) || null,
        postalCode: (formData.get('postalCode') as string) || null,
        country: formData.get('country') as string,
        currency: formData.get('currency') as string,
      };

      const result = await updateCompanyAction(input);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to update company settings');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          {t('company.savedSuccessfully')}
        </div>
      )}

      {/* Company Information */}
      <section className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t('company.companyInfo')}</h2>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              {t('company.companyName')} <span className="text-destructive">*</span>
            </label>
            <FormInput
              type="text"
              id="name"
              name="name"
              required
              maxLength={200}
              defaultValue={initialData.name}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="legalName" className="mb-1.5 block text-sm font-medium">
              {t('company.legalName')}
            </label>
            <FormInput
              type="text"
              id="legalName"
              name="legalName"
              maxLength={200}
              defaultValue={initialData.legalName}
            />
          </div>

          <div>
            <label htmlFor="vatNumber" className="mb-1.5 block text-sm font-medium">
              {t('company.vatNumber')}
            </label>
            <FormInput
              type="text"
              id="vatNumber"
              name="vatNumber"
              maxLength={50}
              placeholder="CHE-123.456.789 MWST"
              defaultValue={initialData.vatNumber}
            />
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t('company.address')}</h2>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="address" className="mb-1.5 block text-sm font-medium">
              Street Address
            </label>
            <FormInput
              type="text"
              id="address"
              name="address"
              maxLength={500}
              defaultValue={initialData.address}
            />
          </div>

          <div>
            <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium">
              Postal Code
            </label>
            <FormInput
              type="text"
              id="postalCode"
              name="postalCode"
              maxLength={20}
              defaultValue={initialData.postalCode}
            />
          </div>

          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
              City
            </label>
            <FormInput
              type="text"
              id="city"
              name="city"
              maxLength={100}
              defaultValue={initialData.city}
            />
          </div>

          <div>
            <label htmlFor="country" className="mb-1.5 block text-sm font-medium">
              Country
            </label>
            <FormSelect
              id="country"
              name="country"
              defaultValue={initialData.country}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t('company.preferences')}</h2>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <label htmlFor="currency" className="mb-1.5 block text-sm font-medium">
              {t('company.defaultCurrency')}
            </label>
            <FormSelect
              id="currency"
              name="currency"
              defaultValue={initialData.currency}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
            isSubmitting && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? tc('saving') : tc('saveChanges')}
        </button>
      </div>
    </form>
  );
}
