"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

/**
 * Shared body for per-section Next.js `error.tsx` boundaries.
 *
 * Each section's error.tsx (sales, contacts, reports, …) used to render
 * an identical 50-line block that differed only in `backHref` and the
 * label of the back button. This component centralises the layout, the
 * Sentry capture, and the translation keys; per-section files become a
 * thin wrapper that hands in the destination of the "back" button.
 */
export function SectionErrorBoundary({
  error,
  reset,
  backHref,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  backHref: string;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full border bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">{t("errorBoundaryTitle")}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {t("errorBoundaryMessage")}
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">ID: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("errorBoundaryReload")}
        </button>
        <Link
          href={backHref}
          className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted/50"
        >
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
