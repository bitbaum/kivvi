'use client';

import { useState } from 'react';
import { Pencil, X, Loader2, Check } from 'lucide-react';
import { updateNumberSequenceAction } from '@/app/actions/settings';
import { cn } from '@/lib/utils';

interface SequenceRowProps {
  sequence: {
    id: string;
    type: string;
    prefix: string;
    nextNumber: number;
    format: string;
  };
  typeLabel: string;
}

export function SequenceRow({ sequence, typeLabel }: SequenceRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const [prefix, setPrefix] = useState(sequence.prefix);
  const [nextNumber, setNextNumber] = useState(sequence.nextNumber);
  const [format, setFormat] = useState(sequence.format);

  function handleCancel() {
    setPrefix(sequence.prefix);
    setNextNumber(sequence.nextNumber);
    setFormat(sequence.format);
    setIsEditing(false);
    setError(null);
    setShowWarning(false);
  }

  function handleNextNumberChange(value: string) {
    const num = parseInt(value, 10) || 1;
    setNextNumber(num);

    // Show warning if setting to lower value (risk of duplicate numbers)
    if (num < sequence.nextNumber) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateNumberSequenceAction(sequence.id, {
        prefix,
        nextNumber,
        format,
      });

      if (result.success) {
        setIsEditing(false);
        setShowWarning(false);
      } else {
        setError(result.error || 'Failed to update sequence');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditing) {
    return (
      <div className="px-6 py-4 space-y-3">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-4 items-center">
          <div className="text-sm font-medium">{typeLabel}</div>
          <div>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              maxLength={10}
              className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <input
              type="number"
              value={nextNumber}
              onChange={(e) => handleNextNumberChange(e.target.value)}
              min={1}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                showWarning && "border-yellow-500"
              )}
            />
          </div>
          <div>
            <input
              type="text"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className={cn(
                'inline-flex items-center justify-center rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors',
                isSubmitting && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg border p-2 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {showWarning && (
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
            ⚠️ Warning: Setting next number to a lower value may create duplicate numbers if documents already exist.
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-4 px-6 py-4 items-center">
      <div className="text-sm font-medium">{typeLabel}</div>
      <div className="text-sm font-mono text-muted-foreground">{sequence.prefix}</div>
      <div className="text-sm font-mono text-muted-foreground">{sequence.nextNumber}</div>
      <div className="text-sm font-mono text-muted-foreground">{sequence.format}</div>
      <div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center justify-center rounded-lg border p-2 hover:bg-muted transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
