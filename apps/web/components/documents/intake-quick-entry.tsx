"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  extractItemsFromTextAction,
  type ExtractedItem,
} from "@/app/actions/ai-extract";
import { IntakeBulkReview } from "./intake-bulk-review";

interface IntakeQuickEntryProps {
  /** Called with confirmed items to add to the form */
  onItemsExtracted: (
    items: Array<{ description: string; quantity: string; unitPrice?: string }>,
  ) => void;
}

type EntryState = "idle" | "loading" | "reviewing" | "success" | "error";

export function IntakeQuickEntry({ onItemsExtracted }: IntakeQuickEntryProps) {
  const t = useTranslations("documents");
  const [text, setText] = useState("");
  const [state, setState] = useState<EntryState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastCount, setLastCount] = useState(0);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);

  const handleExtract = useCallback(async () => {
    if (!text.trim() || state === "loading") return;

    setState("loading");
    setError(null);

    const result = await extractItemsFromTextAction(text);

    if (result.success && result.data && result.data.items.length > 0) {
      setExtractedItems(result.data.items);
      setState("reviewing");
    } else if (result.success && result.data?.items.length === 0) {
      setError(t("aiNoItemsFound"));
      setState("error");
    } else {
      setError(result.error || t("aiExtractionFailed"));
      setState("error");
    }
  }, [text, state, t]);

  const handleConfirm = useCallback(
    (items: ExtractedItem[]) => {
      onItemsExtracted(
        items.map((item) => ({
          description:
            item.description ||
            [item.brand, item.model].filter(Boolean).join(" "),
          quantity: item.quantity,
          unitPrice: item.estimatedPrice || undefined,
        })),
      );
      setLastCount(items.length);
      setState("success");
      setText("");
      setExtractedItems([]);
      setTimeout(() => {
        setState("idle");
        setIsCollapsed(true);
      }, 2000);
    },
    [onItemsExtracted],
  );

  const handleBack = useCallback(() => {
    setState("idle");
    setExtractedItems([]);
  }, []);

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
          {state === "reviewing" ? (
            <IntakeBulkReview
              items={extractedItems}
              onConfirm={handleConfirm}
              onBack={handleBack}
            />
          ) : state === "success" ? (
            <div className="flex items-center gap-2 py-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              {lastCount} {t("itemsAdded")}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {t("aiQuickEntryHint")}
              </p>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                    e.preventDefault();
                    handleExtract();
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
                  onClick={handleExtract}
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

                {state === "error" && error && (
                  <span className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
