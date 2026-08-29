"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function MoneyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
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
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("errorBoundaryMessage")}</p>
      {error.digest && <p className="mt-2 text-xs text-muted-foreground">ID: {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("errorBoundaryReload")}
        </button>
        <Link
          href="/money"
          className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted/50"
        >
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
