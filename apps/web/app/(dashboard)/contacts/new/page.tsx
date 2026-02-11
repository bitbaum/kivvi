'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createContactAction } from '@/app/actions/contacts';
import { cn } from '@/lib/utils';

const CONTACT_TYPES = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'both', label: 'Both' },
] as const;

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

export default function NewContactPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createContactAction(formData);

      if (result.success && result.data) {
        router.push(`/contacts/${result.data.id}`);
      } else {
        setError(result.error || 'Failed to create contact');
      }
    } catch (err) {
      setError('An unexpected error occurred');
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
        Back to Contacts
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">New Contact</h1>
        <p className="text-muted-foreground">
          Create a new customer or vendor contact.
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
            <h2 className="font-semibold">Basic Information</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* Type */}
            <div className="sm:col-span-2">
              <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
                Type <span className="text-destructive">*</span>
              </label>
              <select
                id="type"
                name="type"
                required
                defaultValue="customer"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CONTACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name (company/display name) */}
            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                Company / Display Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                maxLength={200}
                placeholder="e.g. Müller AG"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium">
                First Name
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
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                maxLength={100}
                placeholder="Müller"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </section>

        {/* Contact Details */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Contact Details</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
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
                Phone
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
                Mobile
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
                Website
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
            <h2 className="font-semibold">Address</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* Street */}
            <div className="sm:col-span-2">
              <label htmlFor="address" className="mb-1.5 block text-sm font-medium">
                Street Address
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
                Postal Code
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
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                maxLength={100}
                placeholder="Zürich"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="mb-1.5 block text-sm font-medium">
                Country
              </label>
              <select
                id="country"
                name="country"
                defaultValue="CH"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Financial */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Financial Details</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* VAT Number */}
            <div>
              <label htmlFor="vatNumber" className="mb-1.5 block text-sm font-medium">
                VAT Number
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
                IBAN
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
                Payment Terms (days)
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
                Credit Limit (CHF)
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
            <h2 className="font-semibold">Settings</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* Language */}
            <div>
              <label htmlFor="language" className="mb-1.5 block text-sm font-medium">
                Language
              </label>
              <select
                id="language"
                name="language"
                defaultValue="de"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                maxLength={5000}
                placeholder="Internal notes about this contact..."
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/contacts"
            className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
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
            {isSubmitting ? 'Creating...' : 'Create Contact'}
          </button>
        </div>
      </form>
    </div>
  );
}
