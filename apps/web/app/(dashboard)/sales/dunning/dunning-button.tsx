'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { createDunningAction } from '@/app/actions/dunning';

const LEVEL_LABELS: Record<number, string> = {
  0: 'Send Reminder',
  1: 'Send 2nd Reminder',
  2: 'Send Final Notice',
};

export function DunningButton({
  invoiceId,
  currentLevel,
}: {
  invoiceId: string;
  currentLevel: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createDunningAction(invoiceId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Failed');
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        <Send className="h-3 w-3" />
        {isPending ? 'Sending...' : LEVEL_LABELS[currentLevel] || 'Escalate'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
