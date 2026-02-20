'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { createFiscalYearAction } from '@/app/actions/accounting';
import { useTranslations } from 'next-intl';
import { FormInput } from '@/components/ui/form-field';

export function NewYearForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('accounting');
  const tc = useTranslations('common');

  const currentYear = new Date().getFullYear();
  const [name, setName] = useState(String(currentYear));
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createFiscalYearAction({ name, startDate, endDate });
      if (result.success) {
        setIsOpen(false);
        setName(String(currentYear));
        setStartDate(`${currentYear}-01-01`);
        setEndDate(`${currentYear}-12-31`);
        router.refresh();
      } else {
        setError(result.error || 'Failed to create fiscal year');
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('newFiscalYear')}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="border-t px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="fiscal-year-name"
                className="mb-1.5 block text-sm font-medium"
              >
                {tc('name')}
              </label>
              <FormInput
                id="fiscal-year-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2026"
                required
              />
            </div>

            <div>
              <label
                htmlFor="fiscal-year-start"
                className="mb-1.5 block text-sm font-medium"
              >
                {t('startDate')}
              </label>
              <FormInput
                id="fiscal-year-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="fiscal-year-end"
                className="mb-1.5 block text-sm font-medium"
              >
                {t('endDate')}
              </label>
              <FormInput
                id="fiscal-year-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t('periodsAutoCreated')}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('newFiscalYear')}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              {tc('cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
