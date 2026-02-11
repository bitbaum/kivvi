'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Loader2 } from 'lucide-react';
import { seedChartOfAccountsAction } from '@/app/actions/accounting';

export function SeedButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSeed() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await seedChartOfAccountsAction();
      if (result.success) {
        setSuccess(`${result.data?.count} accounts created successfully.`);
        setShowConfirm(false);
        router.refresh();
      } else {
        setError(result.error || 'Failed to seed chart of accounts.');
      }
    });
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          This will create the Swiss KMU Kontenrahmen. Continue?
        </p>
        <button
          onClick={handleSeed}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Seeding...
            </>
          ) : (
            'Yes, seed accounts'
          )}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
      >
        <Database className="h-4 w-4" />
        Seed Swiss KMU
      </button>
      {success && (
        <p className="mt-1 text-sm text-green-600 dark:text-green-400">{success}</p>
      )}
    </div>
  );
}
