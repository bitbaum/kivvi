'use client';

import { useState } from 'react';
import { Loader2, Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { updateCompanyInfoAction } from '@/app/actions/onboarding';

interface StepCompanyInfoProps {
  companyData: Record<string, any> | null;
  onComplete: () => void;
}

export function StepCompanyInfo({ companyData, onComplete }: StepCompanyInfoProps) {
  const t = useTranslations('onboarding');
  const ts = useTranslations('settings');
  const tc = useTranslations('common');
  const [formData, setFormData] = useState({
    name: companyData?.name || '',
    legalName: companyData?.legalName || '',
    address: companyData?.address || '',
    postalCode: companyData?.postalCode || '',
    city: companyData?.city || '',
    country: companyData?.country || 'CH',
    vatNumber: companyData?.vatNumber || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await updateCompanyInfoAction(formData);
    if (result.success) {
      onComplete();
    } else {
      setError(result.error || 'Failed to save');
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-background p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t('step1Title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Tell us about your company. This information will appear on invoices and documents.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              {t('companyName')} *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="legalName" className="mb-1.5 block text-sm font-medium">
              {ts('company.legalName')}
            </label>
            <input
              id="legalName"
              name="legalName"
              type="text"
              value={formData.legalName}
              onChange={handleChange}
              placeholder="e.g. Muster GmbH"
              className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="mb-1.5 block text-sm font-medium">
              {t('companyAddress')}
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="Bahnhofstrasse 1"
              className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium">
              Postal code
            </label>
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="8001"
              className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              placeholder="Zürich"
              className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="country" className="mb-1.5 block text-sm font-medium">
              Country
            </label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="CH">Switzerland</option>
              <option value="DE">Germany</option>
              <option value="AT">Austria</option>
              <option value="LI">Liechtenstein</option>
            </select>
          </div>

          <div>
            <label htmlFor="vatNumber" className="mb-1.5 block text-sm font-medium">
              {t('vatNumber')}
            </label>
            <input
              id="vatNumber"
              name="vatNumber"
              type="text"
              value={formData.vatNumber}
              onChange={handleChange}
              placeholder="CHE-123.456.789 MWST"
              className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? tc('saving') : tc('next')}
          </button>
        </div>
      </form>
    </div>
  );
}
