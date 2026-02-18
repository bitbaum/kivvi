'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createContactAction } from '@/app/actions/contacts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LANGUAGE_OPTIONS, COUNTRY_OPTIONS } from '@/lib/config/locales';

export default function NewContactPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const t = useTranslations('contacts');
  const tc = useTranslations('common');

  const CONTACT_TYPES = [
    { value: 'customer', label: t('customer') },
    { value: 'vendor', label: t('vendor') },
    { value: 'both', label: t('both') },
  ] as const;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createContactAction(formData);

      if (result.success && result.data) {
        toast.success(t('created'));
        router.push(`/contacts/${result.data.id}`);
      } else {
        setError(result.error || tc('error'));
      }
    } catch (err) {
      setError(tc('error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc('back')} {t('title')}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('newContact')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('basicInformation')}</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* Type */}
            <div className="sm:col-span-2">
              <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
                {tc('type')} <span className="text-destructive">*</span>
              </label>
              <select
                id="type"
                name="type"
                required
                defaultValue="customer"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CONTACT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name (company/display name) */}
            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                {t('companyName')} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                maxLength={200}
                placeholder="e.g. Muller AG"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium">
                {t('firstName')}
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                maxLength={100}
                placeholder="Hans"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium">
                {t('lastName')}
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                maxLength={100}
                placeholder="Muller"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </section>

        {/* Contact Details */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('contactDetails')}</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                {tc('email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="hans@mueller-ag.ch"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
                {tc('phone')}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                maxLength={30}
                placeholder="+41 44 123 45 67"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Mobile */}
            <div>
              <label htmlFor="mobile" className="mb-1.5 block text-sm font-medium">
                {t('mobile')}
              </label>
              <input
                type="tel"
                id="mobile"
                name="mobile"
                maxLength={30}
                placeholder="+41 79 123 45 67"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="mb-1.5 block text-sm font-medium">
                {t('website')}
              </label>
              <input
                type="text"
                id="website"
                name="website"
                maxLength={200}
                placeholder="www.mueller-ag.ch"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('address')}</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* Street */}
            <div className="sm:col-span-2">
              <label htmlFor="address" className="mb-1.5 block text-sm font-medium">
                {t('street')}
              </label>
              <input
                type="text"
                id="address"
                name="address"
                maxLength={500}
                placeholder="Bahnhofstrasse 1"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Postal Code */}
            <div>
              <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium">
                {t('postalCode')}
              </label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                maxLength={20}
                placeholder="8001"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
                {t('city')}
              </label>
              <input
                type="text"
                id="city"
                name="city"
                maxLength={100}
                placeholder="Zurich"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="mb-1.5 block text-sm font-medium">
                {t('country')}
              </label>
              <select
                id="country"
                name="country"
                defaultValue="CH"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="h-4 w-4" />
              {tc('hideAdvanced') || 'Hide Advanced Options'}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {tc('showAdvanced') || 'Show Advanced Options'}
            </>
          )}
        </button>

        {showAdvanced && (
          <>
            {/* Financial */}
            <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('financialDetails')}</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* VAT Number */}
            <div>
              <label htmlFor="vatNumber" className="mb-1.5 block text-sm font-medium">
                {t('vatNumber')}
              </label>
              <input
                type="text"
                id="vatNumber"
                name="vatNumber"
                maxLength={30}
                placeholder="CHE-123.456.789 MWST"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* IBAN */}
            <div>
              <label htmlFor="iban" className="mb-1.5 block text-sm font-medium">
                {t('iban')}
              </label>
              <input
                type="text"
                id="iban"
                name="iban"
                maxLength={34}
                placeholder="CH93 0076 2011 6238 5295 7"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label htmlFor="paymentTermsDays" className="mb-1.5 block text-sm font-medium">
                {t('paymentTerms')} ({t('days')})
              </label>
              <input
                type="number"
                id="paymentTermsDays"
                name="paymentTermsDays"
                min={0}
                max={365}
                defaultValue={30}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Credit Limit */}
            <div>
              <label htmlFor="creditLimit" className="mb-1.5 block text-sm font-medium">
                {t('creditLimit')} (CHF)
              </label>
              <input
                type="text"
                id="creditLimit"
                name="creditLimit"
                placeholder="10000.00"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </section>

        {/* Settings */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{tc('settings')}</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* Language */}
            <div>
              <label htmlFor="language" className="mb-1.5 block text-sm font-medium">
                {t('language')}
              </label>
              <select
                id="language"
                name="language"
                defaultValue="de"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
                {tc('notes')}
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                maxLength={5000}
                placeholder={t('internalNotes')}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>
          </div>
        </section>
          </>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/contacts"
            className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {tc('cancel')}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
              isSubmitting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? tc('creating') : t('newContact')}
          </button>
        </div>
      </form>
    </div>
  );
}
