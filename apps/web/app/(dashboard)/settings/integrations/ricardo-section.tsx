"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  updateRicardoApiKeyAction,
  testRicardoConnectionAction,
} from "@/app/actions/integrations";

interface Props {
  hasApiKey: boolean;
}

export function RicardoSection({ hasApiKey }: Props) {
  const t = useTranslations("settings.integrations.ricardo");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();
  const [apiKey, setApiKey] = useState(hasApiKey ? "••••••••" : "");
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setTestResult(null);
    startTransition(async () => {
      const result = await updateRicardoApiKeyAction(
        apiKey === "••••••••" ? "••••••••" : apiKey || null,
      );
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error ?? t("saveError"));
      }
    });
  }

  function handleTest() {
    setError(null);
    setTestResult(null);
    startTestTransition(async () => {
      const result = await testRicardoConnectionAction();
      setTestResult({
        ok: result.success,
        msg: result.success
          ? t("connectionSuccess")
          : (result.error ?? t("connectionFailed")),
      });
    });
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Ricardo.ch</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}{" "}
            <a
              href="https://api.ricardo.ch"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline hover:text-foreground"
            >
              {t("apiDocs")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="ricardo-api-key"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("apiKey")}
          </label>
          <input
            id="ricardo-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onFocus={() => {
              if (apiKey === "••••••••") setApiKey("");
            }}
            placeholder="clientId:clientSecret"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {testResult && (
          <p
            className={`text-sm ${testResult.ok ? "text-success" : "text-destructive"}`}
          >
            {testResult.ok ? "✓ " : "✗ "}
            {testResult.msg}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saved
              ? t("saved")
              : isPending
                ? tCommon("saving")
                : tCommon("save")}
          </button>
          {hasApiKey && (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 min-h-[44px]"
            >
              {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isTesting ? t("testing") : t("testConnection")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
