'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { updateContactAction } from '@/app/actions/contacts';
import type { Contact } from '@kivvi/database';

const LANGUAGES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Francais' },
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
] as const;

const COUNTRIES = [
  { value: 'CH', label: 'Switzerland' },
  { value: 'DE', label: 'Germany' },
  { value: 'AT', label: 'Austria' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'LI', label: 'Liechtenstein' },
] as const;

interface EditContactFormProps {
  contact: Contact;
}

export function EditContactForm({ contact }: EditContactFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const result = await updateContactAction(contact.id, formData);

      if (result.success) {
        router.push(`/contacts/${contact.id}`);
      } else {
        setError(result.error || tc('error'));
      }
    } catch {
      setError(tc('error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/contacts/${contact.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc('back')} {t('title')}
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{t('editContact')}</h1>
        <p className="text-muted-foreground">
          {contact.name}
          {contact.contactNumber ? ` (${contact.contactNumber})` : ''}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('basicInformation')}</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
                {tc('type')} <span className="text-destructive">*</span>
              </label>
              <select
                id="type"
                name="type"
                required
                defaultValue={contact.type}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CONTACT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>

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
                defaultValue={contact.name}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium">
                {t('firstName')}
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                maxLength={100}
                defaultValue={contact.firstName || ''}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium">
                {t('lastName')}
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                maxLength={100}
                defaultValue={contact.lastName || ''}
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
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">{tc('email')}</label>
              <input type="email" id="email" name="email" defaultValue={contact.email || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">{tc('phone')}</label>
              <input type="tel" id="phone" name="phone" maxLength={30} defaultValue={contact.phone || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="mobile" className="mb-1.5 block text-sm font-medium">{t('mobile')}</label>
              <input type="tel" id="mobile" name="mobile" maxLength={30} defaultValue={contact.mobile || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="website" className="mb-1.5 block text-sm font-medium">{t('website')}</label>
              <input type="text" id="website" name="website" maxLength={200} defaultValue={contact.website || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('address')}</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="address" className="mb-1.5 block text-sm font-medium">{t('street')}</label>
              <input type="text" id="address" name="address" maxLength={500} defaultValue={contact.address || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium">{t('postalCode')}</label>
              <input type="text" id="postalCode" name="postalCode" maxLength={20} defaultValue={contact.postalCode || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="city" className="mb-1.5 block text-sm font-medium">{t('city')}</label>
              <input type="text" id="city" name="city" maxLength={100} defaultValue={contact.city || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="country" className="mb-1.5 block text-sm font-medium">{t('country')}</label>
              <select id="country" name="country" defaultValue={contact.country || 'CH'} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Financial */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('financialDetails')}</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <div>
              <label htmlFor="vatNumber" className="mb-1.5 block text-sm font-medium">{t('vatNumber')}</label>
              <input type="text" id="vatNumber" name="vatNumber" maxLength={30} defaultValue={contact.vatNumber || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="iban" className="mb-1.5 block text-sm font-medium">{t('iban')}</label>
              <input type="text" id="iban" name="iban" maxLength={34} defaultValue={contact.iban || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="paymentTermsDays" className="mb-1.5 block text-sm font-medium">{t('paymentTerms')} ({t('days')})</label>
              <input type="number" id="paymentTermsDays" name="paymentTermsDays" min={0} max={365} defaultValue={contact.paymentTermsDays ?? 30} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="creditLimit" className="mb-1.5 block text-sm font-medium">{t('creditLimit')} (CHF)</label>
              <input type="text" id="creditLimit" name="creditLimit" defaultValue={contact.creditLimit || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </section>

        {/* Settings */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{tc('settings')}</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <div>
              <label htmlFor="language" className="mb-1.5 block text-sm font-medium">{t('language')}</label>
              <select id="language" name="language" defaultValue={contact.language || 'de'} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">{tc('notes')}</label>
              <textarea id="notes" name="notes" rows={4} maxLength={5000} defaultValue={contact.notes || ''} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/contacts/${contact.id}`}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {tc('cancel')}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? tc('saving') : tc('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
}
