'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Power, Loader2 } from 'lucide-react';
import { toggleAccountAction } from '@/app/actions/accounting';
import { useTranslations } from 'next-intl';

interface ToggleButtonProps {
  accountId: string;
  isActive: boolean;
}

export function ToggleButton({ accountId, isActive }: ToggleButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const tc = useTranslations('common');

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleAccountAction(accountId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Failed to toggle account.');
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={isPending}
        title={isActive ? 'Deactivate account' : 'Activate account'}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          isActive
            ? 'text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30'
            : 'text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30'
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Power className="h-3 w-3" />
        )}
        {isActive ? tc('inactive') : tc('active')}
      </button>
      {error && (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap rounded bg-red-50 px-2 py-1 text-xs text-red-600 shadow-sm dark:bg-red-900/30 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
