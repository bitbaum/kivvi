'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import { closeFiscalYearAction, closeFiscalPeriodAction } from '@/app/actions/accounting';

// ============================================================================
// CLOSE YEAR BUTTON
// ============================================================================

interface CloseYearButtonProps {
  yearId: string;
  yearName: string;
}

export function CloseYearButton({ yearId, yearName }: CloseYearButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleClose() {
    startTransition(async () => {
      const result = await closeFiscalYearAction(yearId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || 'Failed to close fiscal year');
      }
      setShowConfirm(false);
    });
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Close &quot;{yearName}&quot;? All open periods will be closed.
        </span>
        <button
          onClick={handleClose}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Yes, Close
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
    >
      <Lock className="h-4 w-4" />
      Close Year
    </button>
  );
}

// ============================================================================
// CLOSE PERIOD BUTTON
// ============================================================================

interface ClosePeriodButtonProps {
  periodId: string;
  periodName: string;
}

export function ClosePeriodButton({ periodId, periodName }: ClosePeriodButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleClose() {
    startTransition(async () => {
      const result = await closeFiscalPeriodAction(periodId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || 'Failed to close period');
      }
      setShowConfirm(false);
    });
  }

  if (showConfirm) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Close?</span>
        <button
          onClick={handleClose}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Yes
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
    >
      <Lock className="h-3 w-3" />
      Close
    </button>
  );
}
