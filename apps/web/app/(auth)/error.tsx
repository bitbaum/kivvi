"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("auth");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full border bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">{t("errorTitle")}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("errorDescription")}</p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("tryAgain")}
        </button>
        <Link
          href="/login"
          className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-muted/50"
        >
          {t("backToSignIn")}
        </Link>
      </div>
    </div>
  );
}
