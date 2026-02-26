'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createProjectAction } from '@/app/actions/projects';
import { cn } from '@/lib/utils';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';

export default function NewProjectPage() {
  const router = useRouter();
  const t = useTranslations('projects');
  const tc = useTranslations('common');

  const PROJECT_STATUSES = [
    { value: 'active', label: t('statusActive') },
    { value: 'completed', label: t('statusCompleted') },
    { value: 'on_hold', label: t('statusOnHold') },
    { value: 'cancelled', label: t('statusCancelled') },
  ];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const input = {
        name: formData.get('name') as string,
        description: (formData.get('description') as string) || undefined,
        contactId: (formData.get('contactId') as string) || undefined,
        status: (formData.get('status') as string) || 'active',
        budget: formData.get('budget')
          ? Number(formData.get('budget') as string)
          : undefined,
        startDate: (formData.get('startDate') as string) || undefined,
        endDate: (formData.get('endDate') as string) || undefined,
      };

      const result = await createProjectAction(input);

      if (result.success && result.data) {
        router.push(`/projects/${(result.data as { id: string }).id}`);
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
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc('back')}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('newProject')}</h1>
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
            {/* Name */}
            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                {t('projectName')} <span className="text-destructive">*</span>
              </label>
              <FormInput
                type="text"
                id="name"
                name="name"
                required
                maxLength={200}
                placeholder={t('placeholders.projectName')}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
                {tc('description')}
              </label>
              <FormTextarea
                id="description"
                name="description"
                rows={3}
                maxLength={5000}
                placeholder={t('descriptionPlaceholder')}
                className="resize-y"
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="mb-1.5 block text-sm font-medium">
                {tc('status')}
              </label>
              <FormSelect
                id="status"
                name="status"
                defaultValue="active"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </FormSelect>
            </div>

            {/* Budget */}
            <div>
              <label htmlFor="budget" className="mb-1.5 block text-sm font-medium">
                {t('budget')}
              </label>
              <FormInput
                type="number"
                id="budget"
                name="budget"
                min={0}
                step="0.01"
                placeholder="10000.00"
              />
            </div>
          </div>
        </section>

        {/* Client & Dates */}
        <section className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t('clientAndSchedule')}</h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {/* Contact ID */}
            <div className="sm:col-span-2">
              <label htmlFor="contactId" className="mb-1.5 block text-sm font-medium">
                {t('clientContactId')}
              </label>
              <FormInput
                type="text"
                id="contactId"
                name="contactId"
                placeholder={t('contactPlaceholder')}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('contactIdHint')}
              </p>
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="startDate" className="mb-1.5 block text-sm font-medium">
                {t('startDate')}
              </label>
              <FormInput
                type="date"
                id="startDate"
                name="startDate"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="endDate" className="mb-1.5 block text-sm font-medium">
                {t('endDate')}
              </label>
              <FormInput
                type="date"
                id="endDate"
                name="endDate"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/projects"
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
            {isSubmitting ? tc('creating') : t('createProject')}
          </button>
        </div>
      </form>
    </div>
  );
}
