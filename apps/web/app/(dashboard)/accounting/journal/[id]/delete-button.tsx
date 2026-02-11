'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteJournalEntryAction } from '@/app/actions/accounting';

interface DeleteJournalEntryButtonProps {
  entryId: string;
}

export function DeleteJournalEntryButton({ entryId }: DeleteJournalEntryButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-red-600 dark:text-red-400">Delete this entry?</span>
      <button
        onClick={() => {
          startTransition(async () => {
            const result = await deleteJournalEntryAction(entryId);
            if (result.success) {
              router.push('/accounting/journal');
            } else {
              alert(result.error || 'Failed to delete journal entry');
              setConfirming(false);
            }
          });
        }}
        disabled={isPending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? 'Deleting...' : 'Yes, Delete'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
      >
        No
      </button>
    </div>
  );
}
