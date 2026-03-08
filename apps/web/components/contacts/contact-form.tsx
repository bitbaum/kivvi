'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createContactAction, updateContactAction } from '@/app/actions/contacts';
import type { Contact } from '@kivvi/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LANGUAGE_OPTIONS, COUNTRY_OPTIONS } from '@/lib/config/locales';
import { CONTACT_TYPES } from '@/lib/config/contact-types';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';

interface ContactFormProps {
  mode: 'create' | 'edit';
  contact?: Contact;
}

export function ContactForm({ mode, contact }: ContactFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const t = useTranslations('contacts');
  const tc = useTranslations('common');

  const isEdit = mode === 'edit';
  const contactTypeOptions = CONTACT_TYPES.map((ct) => ({ value: ct, label: t(ct) }));

  const backHref = isEdit ? `/contacts/${contact!.id}` : '/contacts';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);

      if (isEdit) {
        const result = await updateContactAction(contact!.id, formData);
        if (result.success) {
          toast.success(t('updated'));
          router.push(`/contacts/${contact!.id}`);
        } else {
          setError(result.error || tc('error'));
        }
      } else {
        const result = await createContactAction(formData);
        if (result.success && result.data) {
          toast.success(t('created'));
          router.push(`/contacts/${result.data.id}`);
        } else {
          setError(result.error || tc('error'));
        }
      }
    } catch {
      setError(tc('error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc('back')} {t('title')}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {isEdit ? t('editContact') : t('newContact')}
        </h1>
        <p className="text-muted-foreground">
          {isEdit
            ? `${contact!.name}${contact!.contactNumber ? ` (${contact!.contactNumber})` : ''}`
            : t('subtitle')}
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
            <div className="sm:col-span-2">
              <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
                {tc('type')} <span className="text-destructive">*</span>
              </label>
              <FormSelect
                id="type"
                name="type"
                required
                defaultValue={contact?.type || 'customer'}
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
                defaultValue={contact?.name || ''}
                placeholder={!isEdit ? t('placeholders.companyName') : undefined}
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
                defaultValue={contact?.firstName || ''}
                placeholder={!isEdit ? 'Hans' : undefined}
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
                defaultValue={contact?.lastName || ''}
                placeholder={!isEdit ? 'Muller' : undefined}
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
              <FormInput
                type="email"
                id="email"
                name="email"
                defaultValue={contact?.email || ''}
                placeholder={!isEdit ? 'hans@mueller-ag.ch' : undefined}
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">{tc('phone')}</label>
              <FormInput
                type="tel"
                id="phone"
                name="phone"
                maxLength={30}
                defaultValue={contact?.phone || ''}
                placeholder={!isEdit ? '+41 44 123 45 67' : undefined}
              />
            </div>
            <div>
              <label htmlFor="mobile" className="mb-1.5 block text-sm font-medium">{t('mobile')}</label>
              <FormInput
                type="tel"
                id="mobile"
                name="mobile"
                maxLength={30}
                defaultValue={contact?.mobile || ''}
                placeholder={!isEdit ? '+41 79 123 45 67' : undefined}
              />
            </div>
            <div>
              <label htmlFor="website" className="mb-1.5 block text-sm font-medium">{t('website')}</label>
              <FormInput
                type="text"
                id="website"
                name="website"
                maxLength={200}
                defaultValue={contact?.website || ''}
                placeholder={!isEdit ? 'www.mueller-ag.ch' : undefined}
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
            <div className="sm:col-span-2">
              <label htmlFor="address" className="mb-1.5 block text-sm font-medium">{t('street')}</label>
              <FormInput
                type="text"
                id="address"
                name="address"
                maxLength={500}
                defaultValue={contact?.address || ''}
                placeholder={!isEdit ? 'Bahnhofstrasse 1' : undefined}
              />
            </div>
            <div>
              <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium">{t('postalCode')}</label>
              <FormInput
                type="text"
                id="postalCode"
                name="postalCode"
                maxLength={20}
                defaultValue={contact?.postalCode || ''}
                placeholder={!isEdit ? '8001' : undefined}
              />
            </div>
            <div>
              <label htmlFor="city" className="mb-1.5 block text-sm font-medium">{t('city')}</label>
              <FormInput
                type="text"
                id="city"
                name="city"
                maxLength={100}
                defaultValue={contact?.city || ''}
                placeholder={!isEdit ? 'Zurich' : undefined}
              />
            </div>
            <div>
              <label htmlFor="country" className="mb-1.5 block text-sm font-medium">{t('country')}</label>
              <FormSelect id="country" name="country" defaultValue={contact?.country || 'CH'}>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{tc(`countries.${c.toLowerCase()}`)}</option>
                ))}
              </FormSelect>
            </div>
          </div>
        </section>

        {/* Advanced Options Toggle (create mode only) */}
        {!isEdit && (
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
        )}

        {/* Financial & Settings — always visible in edit mode, toggleable in create */}
        {(isEdit || showAdvanced) && (
          <>
            {/* Financial */}
            <section className="rounded-xl border bg-card">
              <div className="border-b px-6 py-4">
                <h2 className="font-semibold">{t('financialDetails')}</h2>
              </div>
              <div className="grid gap-6 p-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="vatNumber" className="mb-1.5 block text-sm font-medium">{t('vatNumber')}</label>
                  <FormInput
                    type="text"
                    id="vatNumber"
                    name="vatNumber"
                    maxLength={30}
                    defaultValue={contact?.vatNumber || ''}
                    placeholder={!isEdit ? t('placeholders.vatNumber') : undefined}
                  />
                </div>
                <div>
                  <label htmlFor="iban" className="mb-1.5 block text-sm font-medium">{t('iban')}</label>
                  <FormInput
                    type="text"
                    id="iban"
                    name="iban"
                    maxLength={34}
                    defaultValue={contact?.iban || ''}
                    placeholder={!isEdit ? 'CH93 0076 2011 6238 5295 7' : undefined}
                  />
                </div>
                <div>
                  <label htmlFor="paymentTermsDays" className="mb-1.5 block text-sm font-medium">
                    {t('paymentTerms')} ({t('days')})
                  </label>
                  <FormInput
                    type="number"
                    id="paymentTermsDays"
                    name="paymentTermsDays"
                    min={0}
                    max={365}
                    defaultValue={contact?.paymentTermsDays ?? 30}
                  />
                </div>
                <div>
                  <label htmlFor="creditLimit" className="mb-1.5 block text-sm font-medium">
                    {t('creditLimit')} (CHF)
                  </label>
                  <FormInput
                    type="text"
                    id="creditLimit"
                    name="creditLimit"
                    defaultValue={contact?.creditLimit || ''}
                    placeholder={!isEdit ? '10000.00' : undefined}
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
                <div>
                  <label htmlFor="language" className="mb-1.5 block text-sm font-medium">{t('language')}</label>
                  <FormSelect id="language" name="language" defaultValue={contact?.language || 'de'}>
                    {LANGUAGE_OPTIONS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </FormSelect>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">{tc('notes')}</label>
                  <FormTextarea
                    id="notes"
                    name="notes"
                    rows={4}
                    maxLength={5000}
                    defaultValue={contact?.notes || ''}
                    placeholder={!isEdit ? t('internalNotes') : undefined}
                    className="resize-y"
                  />
                </div>
              </div>
            </section>
          </>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
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
              'inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
              isSubmitting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting
              ? isEdit ? tc('saving') : tc('creating')
              : isEdit ? tc('saveChanges') : t('newContact')}
          </button>
        </div>
      </form>
    </div>
  );
}
