"use client";

import { Sparkles, Loader2, Undo2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { UseAiForm } from "@fleet/ai-forms/react";

interface AiFormBarProps {
  /** The form store the user and the assistant both write to. */
  form: UseAiForm;
  /** Placeholder for an empty form — what to describe. */
  fillPlaceholder: string;
  /** Placeholder once the form has content — what to change. */
  refinePlaceholder: string;
}

/**
 * The one control for AI form assistance. Generic on purpose: it knows nothing
 * about contacts, products or documents, only about a `UseAiForm` store — so
 * every form in the app gets the same affordance from one implementation.
 *
 * It replaces the per-form fill button, which could only fill. The difference
 * that matters is the second turn: this bar stays open after a fill so the user
 * can say "shorter" or "actually they are a supplier" and have it applied to
 * what is already there. `useAiForm` infers fill vs refine from whether the
 * form is empty, so there is no mode for the user to get wrong.
 *
 * Rendering is local to this app (the package ships no markup) and uses the
 * same tokens as the rest of the form.
 */
export function AiFormBar({
  form,
  fillPlaceholder,
  refinePlaceholder,
}: AiFormBarProps) {
  const [instruction, setInstruction] = useState("");
  const t = useTranslations("aiForm");

  async function submit() {
    const text = instruction.trim();
    if (!text || form.busy) return;
    const result = await form.ask(text);
    // Keep the instruction on failure so the user can edit rather than retype.
    if (result.ok) setInstruction("");
  }

  const isRefining = !form.isEmpty;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="h-4 w-4" />
        {isRefining ? t("refineTitle") : t("fillTitle")}
      </div>

      <p className="text-xs text-muted-foreground">
        {isRefining ? t("refineHint") : t("fillHint")}
      </p>

      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder={isRefining ? refinePlaceholder : fillPlaceholder}
        disabled={form.busy}
        className="min-h-[72px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
      />

      {form.error ? (
        <p role="alert" className="text-xs text-destructive">
          {form.error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={form.busy || !instruction.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {form.busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isRefining ? t("refineSubmit") : t("fillSubmit")}
        </button>

        {/* Every AI edit has to be reversible, or the user cannot safely try one. */}
        {form.canUndo ? (
          <button
            type="button"
            onClick={form.undo}
            disabled={form.busy}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {t("undo")}
          </button>
        ) : null}

        <span className="ml-auto text-xs text-muted-foreground">⌘+Enter</span>
      </div>

      {/* What changed, so the user does not have to hunt for it. */}
      {form.changed.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("changedFields", { count: form.changed.length })}
        </p>
      ) : null}
    </div>
  );
}
