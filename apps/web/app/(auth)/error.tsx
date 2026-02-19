'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full border bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">
        Ein Fehler ist aufgetreten
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Bitte versuchen Sie es erneut oder kehren Sie zur Anmeldeseite zurück.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Erneut versuchen
        </button>
        <Link
          href="/login"
          className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted/50"
        >
          Zur Anmeldung
        </Link>
      </div>
    </div>
  );
}
