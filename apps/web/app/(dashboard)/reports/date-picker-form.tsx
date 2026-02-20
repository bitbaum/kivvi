'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FormInput } from '@/components/ui/form-field';

export function DatePickerForm({
  defaultDate,
}: {
  defaultDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [date, setDate] = useState(defaultDate);
  const t = useTranslations('reports');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (date) params.set('asOfDate', date);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div>
        <label
          htmlFor="asOfDate"
          className="mb-1 block text-sm font-medium text-muted-foreground"
        >
          {t('asOfDate')}
        </label>
        <FormInput
          id="asOfDate"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Search className="h-4 w-4" />
        {t('generate')}
      </button>
    </form>
  );
}
