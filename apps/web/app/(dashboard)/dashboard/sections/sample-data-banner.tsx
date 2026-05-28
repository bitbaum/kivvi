"use client";

import { useState, useTransition } from "react";
import { FlaskConical, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { clearSampleDataAction } from "@/app/actions/onboarding";

export function SampleDataBanner() {
  const t = useTranslations("dashboard.sampleData");
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;

  function handleClear() {
    startTransition(async () => {
      await clearSampleDataAction();
      setDismissed(true);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      <FlaskConical className="h-4 w-4 shrink-0 text-warning" />
      <p className="flex-1 text-foreground">{t("notice")}</p>
      <button
        onClick={handleClear}
        disabled={isPending}
        className="shrink-0 rounded-md border border-warning/40 bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-warning/10 disabled:opacity-50"
      >
        {isPending ? t("clearing") : t("clearButton")}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent-muted hover:text-foreground"
        aria-label={t("close")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
