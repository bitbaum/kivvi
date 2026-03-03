'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { createBankAccountAction } from '@/app/actions/banking';
import { useTranslations } from 'next-intl';
import { FormInput, FormSelect } from '@/components/ui/form-field';
import { useFocusTrap } from '@/hooks/use-focus-trap';

export function AddAccountForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('banking');
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);
  const tc = useTranslations('common');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const input = {
      name: formData.get('name') as string,
      iban: (formData.get('iban') as string) || undefined,
      bankName: (formData.get('bankName') as string) || undefined,
      currency: (formData.get('currency') as string) || 'CHF',
    };

    startTransition(async () => {
      const result = await createBankAccountAction(input);
      if (result.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(result.error || tc('error'));
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t('addAccount')}
      </button>
    );
  }

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('addAccount')}</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('accountName')} <span className="text-red-500">*</span>
            </label>
            <FormInput
              name="name"
              type="text"
              required
              placeholder={t('placeholders.accountName')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">IBAN</label>
            <FormInput
              name="iban"
              type="text"
              placeholder="CH93 0076 2011 6238 5295 7"
              className="font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('bankName')}</label>
            <FormInput
              name="bankName"
              type="text"
              placeholder={t('placeholders.bankName')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{tc('currency')}</label>
            <FormSelect
              name="currency"
              defaultValue="CHF"
            >
              <option value="CHF">CHF</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </FormSelect>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? tc('creating') : tc('create')}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              {tc('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
