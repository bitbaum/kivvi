'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Loader2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { updateProjectAction } from '@/app/actions/projects';
import { cn } from '@/lib/utils';
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL_KEYS } from '@/lib/config/project-status';

interface ProjectEditFormProps {
  projectId: string;
  initialData: {
    name: string;
    description: string;
    contactId: string;
    status: string;
    budget: string;
    startDate: string;
    endDate: string;
  };
}

export function ProjectEditForm({ projectId, initialData }: ProjectEditFormProps) {
  const router = useRouter();
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const statusOptions = PROJECT_STATUSES.map((s) => ({ value: s, label: t(PROJECT_STATUS_LABEL_KEYS[s]) }));
  const [isOpen, setIsOpen] = useState(false);
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
        description: (formData.get('description') as string) || undefined,
        contactId: (formData.get('contactId') as string) || undefined,
        status: formData.get('status') as string,
        budget: formData.get('budget')
          ? Number(formData.get('budget') as string)
          : undefined,
        startDate: (formData.get('startDate') as string) || undefined,
        endDate: (formData.get('endDate') as string) || undefined,
      };

      const result = await updateProjectAction(projectId, input);

      if (result.success) {
        setSuccess(true);
        router.refresh();
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to update project');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold">
          <Pencil className="h-4 w-4 text-muted-foreground" />
          {t('editProject')}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t px-6 py-6">
          {/* Error banner */}
          {error && (
            <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Success banner */}
          {success && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
              {tc('saveChanges')}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Name */}
              <div className="sm:col-span-2">
                <label htmlFor="edit-name" className="mb-1.5 block text-sm font-medium">
                  {t('projectName')} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={initialData.name}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label htmlFor="edit-description" className="mb-1.5 block text-sm font-medium">
                  {tc('description')}
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  rows={3}
                  maxLength={5000}
                  defaultValue={initialData.description}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="edit-status" className="mb-1.5 block text-sm font-medium">
                  {tc('status')}
                </label>
                <select
                  id="edit-status"
                  name="status"
                  defaultValue={initialData.status}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget */}
              <div>
                <label htmlFor="edit-budget" className="mb-1.5 block text-sm font-medium">
                  {t('budget')} (CHF)
                </label>
                <input
                  type="number"
                  id="edit-budget"
                  name="budget"
                  min={0}
                  step="0.01"
                  defaultValue={initialData.budget}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Contact ID */}
              <div className="sm:col-span-2">
                <label htmlFor="edit-contactId" className="mb-1.5 block text-sm font-medium">
                  Client (Contact ID)
                </label>
                <input
                  type="text"
                  id="edit-contactId"
                  name="contactId"
                  defaultValue={initialData.contactId}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Start Date */}
              <div>
                <label htmlFor="edit-startDate" className="mb-1.5 block text-sm font-medium">
                  {t('startDate')}
                </label>
                <input
                  type="date"
                  id="edit-startDate"
                  name="startDate"
                  defaultValue={initialData.startDate}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* End Date */}
              <div>
                <label htmlFor="edit-endDate" className="mb-1.5 block text-sm font-medium">
                  {t('endDate')}
                </label>
                <input
                  type="date"
                  id="edit-endDate"
                  name="endDate"
                  defaultValue={initialData.endDate}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 border-t pt-6">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                {tc('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? tc('saving') : tc('saveChanges')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
