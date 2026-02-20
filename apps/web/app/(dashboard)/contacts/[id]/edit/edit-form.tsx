'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { updateContactAction } from '@/app/actions/contacts';
import type { Contact } from '@kivvi/database';
import { toast } from 'sonner';
import { LANGUAGE_OPTIONS, COUNTRY_OPTIONS } from '@/lib/config/locales';
import { CONTACT_TYPES } from '@/lib/config/contact-types';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';

interface EditContactFormProps {
  contact: Contact;
}

export function EditContactForm({ contact }: EditContactFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = useTranslations('contacts');
  const tc = useTranslations('common');

  const contactTypeOptions = CONTACT_TYPES.map((ct) => ({ value: ct, label: t(ct) }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await updateContactAction(contact.id, formData);

      if (result.success) {
        toast.success(t('updated'));
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
              <FormSelect
                id="type"
                name="type"
                required
                defaultValue={contact.type}
              >
                {contactTypeOptions.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </FormSelect>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                {t('companyName')} <span className="text-destructive">*</span>
              </label>
              <FormInput
                type="text"
                id="name"
                name="name"
                required
                maxLength={200}
                defaultValue={contact.name}
              />
            </div>

            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium">
                {t('firstName')}
              </label>
              <FormInput
                type="text"
                id="firstName"
                name="firstName"
                maxLength={100}
                defaultValue={contact.firstName || ''}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium">
                {t('lastName')}
              </label>
              <FormInput
                type="text"
                id="lastName"
                name="lastName"
                maxLength={100}
                defaultValue={contact.lastName || ''}
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
              <FormInput type="email" id="email" name="email" defaultValue={contact.email || ''} />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">{tc('phone')}</label>
              <FormInput type="tel" id="phone" name="phone" maxLength={30} defaultValue={contact.phone || ''} />
            </div>
            <div>
              <label htmlFor="mobile" className="mb-1.5 block text-sm font-medium">{t('mobile')}</label>
              <FormInput type="tel" id="mobile" name="mobile" maxLength={30} defaultValue={contact.mobile || ''} />
            </div>
            <div>
              <label htmlFor="website" className="mb-1.5 block text-sm font-medium">{t('website')}</label>
              <FormInput type="text" id="website" name="website" maxLength={200} defaultValue={contact.website || ''} />
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
              <FormInput type="text" id="address" name="address" maxLength={500} defaultValue={contact.address || ''} />
            </div>
            <div>
              <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium">{t('postalCode')}</label>
              <FormInput type="text" id="postalCode" name="postalCode" maxLength={20} defaultValue={contact.postalCode || ''} />
            </div>
            <div>
              <label htmlFor="city" className="mb-1.5 block text-sm font-medium">{t('city')}</label>
              <FormInput type="text" id="city" name="city" maxLength={100} defaultValue={contact.city || ''} />
            </div>
            <div>
              <label htmlFor="country" className="mb-1.5 block text-sm font-medium">{t('country')}</label>
              <FormSelect id="country" name="country" defaultValue={contact.country || 'CH'}>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </FormSelect>
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
              <FormInput type="text" id="vatNumber" name="vatNumber" maxLength={30} defaultValue={contact.vatNumber || ''} />
            </div>
            <div>
              <label htmlFor="iban" className="mb-1.5 block text-sm font-medium">{t('iban')}</label>
              <FormInput type="text" id="iban" name="iban" maxLength={34} defaultValue={contact.iban || ''} />
            </div>
            <div>
              <label htmlFor="paymentTermsDays" className="mb-1.5 block text-sm font-medium">{t('paymentTerms')} ({t('days')})</label>
              <FormInput type="number" id="paymentTermsDays" name="paymentTermsDays" min={0} max={365} defaultValue={contact.paymentTermsDays ?? 30} />
            </div>
            <div>
              <label htmlFor="creditLimit" className="mb-1.5 block text-sm font-medium">{t('creditLimit')} (CHF)</label>
              <FormInput type="text" id="creditLimit" name="creditLimit" defaultValue={contact.creditLimit || ''} />
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
              <FormSelect id="language" name="language" defaultValue={contact.language || 'de'}>
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </FormSelect>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">{tc('notes')}</label>
              <FormTextarea id="notes" name="notes" rows={4} maxLength={5000} defaultValue={contact.notes || ''} className="resize-y" />
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
