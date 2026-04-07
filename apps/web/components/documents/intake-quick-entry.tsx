"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { extractItemsFromTextAction } from "@/app/actions/ai-extract";

interface IntakeQuickEntryProps {
  /** Called with extracted items to add to the form */
  onItemsExtracted: (
    items: Array<{ description: string; quantity: string }>,
  ) => void;
}

type EntryState = "idle" | "loading" | "success" | "error";

export function IntakeQuickEntry({ onItemsExtracted }: IntakeQuickEntryProps) {
  const t = useTranslations("documents");
  const [text, setText] = useState("");
  const [state, setState] = useState<EntryState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastCount, setLastCount] = useState(0);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || state === "loading") return;

    setState("loading");
    setError(null);

    const result = await extractItemsFromTextAction(text);

    if (result.success && result.data && result.data.items.length > 0) {
      onItemsExtracted(result.data.items);
      setLastCount(result.data.items.length);
      setState("success");
      setTimeout(() => {
        setState("idle");
        setText("");
        setIsCollapsed(true);
      }, 2000);
    } else if (result.success && result.data?.items.length === 0) {
      setError(t("aiNoItemsFound"));
      setState("error");
    } else {
      setError(result.error || t("aiExtractionFailed"));
      setState("error");
    }
  }, [text, state, onItemsExtracted, t]);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{t("aiQuickEntry")}</span>
          {isCollapsed && state === "success" && (
            <span className="text-xs text-green-600 dark:text-green-400">
              ({lastCount} {t("itemsAdded")})
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-primary" />
        ) : (
          <ChevronUp className="h-4 w-4 text-primary" />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("aiQuickEntryHint")}
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={t("aiQuickEntryPlaceholder")}
            disabled={state === "loading"}
            rows={3}
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() || state === "loading"}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {state === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("aiAnalyzing")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("aiExtractItems")}
                </>
              )}
            </button>

            {state === "success" && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {lastCount} {t("itemsAdded")}
              </span>
            )}

            {state === "error" && error && (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
