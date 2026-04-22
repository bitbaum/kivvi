"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { extractContactFromTextAction } from "@/app/actions/ai-extract";
import type { ExtractedContact } from "@/app/actions/ai-extract";
import { toast } from "sonner";

interface AiFillButtonProps {
  onFill: (data: ExtractedContact) => void;
}

/**
 * Inline AI form filler for the contact form.
 * Shows a text input where the user describes the contact in natural language.
 * On submit, calls the AI extraction action and passes the result back.
 */
export function ContactAiFillButton({ onFill }: AiFillButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("contacts");

  async function handleFill() {
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      const result = await extractContactFromTextAction(text);
      if (result.success && result.data) {
        onFill(result.data);
        setIsOpen(false);
        setText("");
        toast.success(t("aiFillSuccess"));
      } else {
        toast.error(result.error || t("aiFillError"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        {t("aiFillButton")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="h-4 w-4" />
        {t("aiFillTitle")}
      </div>
      <p className="text-xs text-muted-foreground">{t("aiFillHint")}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("aiFillPlaceholder")}
        className="min-h-[72px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleFill();
          if (e.key === "Escape") setIsOpen(false);
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleFill}
          disabled={isLoading || !text.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {t("aiFillSubmit")}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setText("");
          }}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          {t("cancel")}
        </button>
        <span className="ml-auto text-xs text-muted-foreground">⌘+Enter</span>
      </div>
    </div>
  );
}
