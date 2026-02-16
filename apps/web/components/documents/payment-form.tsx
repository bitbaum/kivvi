'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CreditCard } from 'lucide-react';
import { recordPaymentAction } from '@/app/actions/documents';

export function PaymentForm({
  documentId,
  outstanding,
  currency,
}: {
  documentId: string;
  outstanding: number;
  currency: string;
}) {
  const router = useRouter();
  const t = useTranslations('documents');
  const tc = useTranslations('common');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        <CreditCard className="h-4 w-4" />
        {t('recordPayment')}
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await recordPaymentAction(documentId, {
        amount: formData.get('amount') as string,
        date: formData.get('date') as string,
        method: (formData.get('method') as 'bank_transfer' | 'cash' | 'card' | 'other') || 'bank_transfer',
        reference: (formData.get('reference') as string) || undefined,
      });

      if (result.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(result.error || 'Failed to record payment');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-muted-foreground">{t('paymentAmount')} ({currency})</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          defaultValue={outstanding.toFixed(2)}
          required
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground">{t('paymentDate')}</label>
        <input
          name="date"
          type="date"
          defaultValue={new Date().toISOString().split('T')[0]}
          required
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground">{t('paymentMethod')}</label>
        <select
          name="method"
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="bank_transfer">{t('paymentMethods.bank_transfer')}</option>
          <option value="cash">{t('paymentMethods.cash')}</option>
          <option value="card">{t('paymentMethods.card')}</option>
          <option value="other">{t('paymentMethods.other')}</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground">{tc('notes')}</label>
        <input
          name="reference"
          type="text"
          placeholder={t('paymentReference')}
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isPending ? tc('saving') : t('savePayment')}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
        >
          {tc('cancel')}
        </button>
      </div>
    </form>
  );
}
