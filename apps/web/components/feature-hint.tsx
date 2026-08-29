"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Sparkles } from "lucide-react";

interface FeatureHintProps {
  /** Unique key for localStorage persistence */
  id: string;
  /** The hint message */
  message: string;
  /** Optional action label (e.g., "Try it") */
  actionLabel?: string;
  /** Optional action callback */
  onAction?: () => void;
}

/**
 * A dismissable hint banner that appears once per user.
 * Dismissed state is stored in localStorage.
 */
export function FeatureHint({ id, message, actionLabel, onAction }: FeatureHintProps) {
  const tAria = useTranslations("common.aria");
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(`hint-dismissed-${id}`);
    if (!stored) setDismissed(false);
  }, [id]);

  function handleDismiss() {
    localStorage.setItem(`hint-dismissed-${id}`, "true");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm">
      <Sparkles className="h-4 w-4 shrink-0 text-brand" />
      <span className="flex-1 text-foreground">{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {actionLabel}
        </button>
      )}
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
        aria-label={tAria("dismiss")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
