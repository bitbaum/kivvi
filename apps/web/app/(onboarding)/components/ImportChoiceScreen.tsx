"use client";

import { Database, Rocket, Upload, Loader2, FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";

interface ImportChoiceScreenProps {
  error: string;
  isCompleting: boolean;
  onImportData: () => void;
  onStartFresh: () => void;
  onSampleData: () => void;
}

export function ImportChoiceScreen({
  error,
  isCompleting,
  onImportData,
  onStartFresh,
  onSampleData,
}: ImportChoiceScreenProps) {
  const t = useTranslations("onboarding");

  return (
    <div className="rounded-xl border bg-background p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("dataImport")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("importDataQuestion")}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={onImportData}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div>
            <div className="font-semibold">{t("importData")}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {t("importDataDesc")}
            </div>
          </div>
        </button>

        <button
          onClick={onStartFresh}
          disabled={isCompleting}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
        >
          {isCompleting ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : (
            <Rocket className="h-10 w-10 text-muted-foreground" />
          )}
          <div>
            <div className="font-semibold">{t("startFresh")}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {t("startFreshDesc")}
            </div>
          </div>
        </button>

        <button
          onClick={onSampleData}
          disabled={isCompleting}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
        >
          {isCompleting ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : (
            <FlaskConical className="h-10 w-10 text-muted-foreground" />
          )}
          <div>
            <div className="font-semibold">{t("sampleData")}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {t("sampleDataDesc")}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
