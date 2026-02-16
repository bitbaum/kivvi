'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { deleteDocumentAction } from '@/app/actions/documents';

export function DocumentDeleteButton({
  documentId,
  redirectTo,
}: {
  documentId: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const tc = useTranslations('common');
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-red-600 dark:text-red-400">{tc('delete')}?</span>
      <button
        onClick={() => {
          startTransition(async () => {
            const result = await deleteDocumentAction(documentId);
            if (result.success) router.push(redirectTo);
          });
        }}
        disabled={isPending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? tc('deleting') : tc('yes')}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
      >
        {tc('no')}
      </button>
    </div>
  );
}
