"use client";

import { useEffect } from "react";
import { Search, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useCommandBarAI } from "@/hooks/use-command-bar-ai";
import { AIResponsePanel } from "@/components/command-bar/ai-response-panel";

/** Detect if a query looks like natural language (AI mode trigger) */
function looksLikeAIQuery(q: string): boolean {
  const trimmed = q.trim();
  if (trimmed.length > 25) return true;
  const verbs =
    /^(create|erstell|find|such|send|schick|mark|show|zeig|list|get|invoice|rechnung|angebot|quote|order|auftrag|how|what|wieviel|was|wie)/i;
  return verbs.test(trimmed);
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const tc = useTranslations("common");
  const t = useTranslations("commandPalette");
  const {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    isSearching,
    sections,
    inputRef,
    listRef,
    navigate,
    handleKeyDown: staticHandleKeyDown,
  } = useCommandPalette(isOpen, onClose);

  const ai = useCommandBarAI();

  const aiActive =
    ai.isProcessing || ai.message || ai.actions.length > 0 || ai.error;
  const showAI = looksLikeAIQuery(query) || !!aiActive;

  // Reset AI state when palette closes
  useEffect(() => {
    if (!isOpen) ai.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter in AI mode: submit to AI instead of navigating
    if (e.key === "Enter" && showAI && !ai.isProcessing && !aiActive) {
      e.preventDefault();
      ai.submit(query);
      return;
    }
    // Enter when AI has actions: activate first primary action
    if (e.key === "Enter" && ai.actions.length > 0) {
      e.preventDefault();
      const primary =
        ai.actions.find((a) => a.variant === "primary") || ai.actions[0];
      const url = primary?.params?.url as string | undefined;
      if (url) {
        onClose();
        navigate(url);
      }
      return;
    }
    // Fall through to static navigation
    staticHandleKeyDown(e);
  }

  if (!isOpen) return null;

  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[20vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={tc("aria.commandPalette")}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {showAI ? (
            <Sparkles
              className="h-4 w-4 shrink-0 text-brand"
              aria-hidden="true"
            />
          ) : (
            <Search
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
              // Reset AI when user changes query
              if (aiActive) ai.reset();
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label={tc("search")}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                ai.reset();
              }}
              className="rounded p-0.5 hover:bg-muted"
              aria-label={tc("aria.clearSearch")}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <kbd
            className="hidden rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block"
            aria-hidden="true"
          >
            Esc
          </kbd>
        </div>

        {/* Static results */}
        <div
          ref={listRef}
          className="max-h-[40vh] overflow-y-auto p-2"
          role="listbox"
        >
          {sections.length === 0 && !isSearching && !showAI ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("noResults")}
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.key} role="group" aria-label={section.label}>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const itemIndex = globalIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-selected={isSelected}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-left transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span
                        className={
                          isSelected
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                        }
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
          {isSearching && (
            <div className="px-3 py-2 text-center text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
          )}

          {/* AI hint when query looks like natural language but not yet submitted */}
          {showAI && !aiActive && query.trim().length > 0 && (
            <button
              onClick={() => ai.submit(query)}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left text-muted-foreground hover:bg-muted"
            >
              <Sparkles className="h-4 w-4 text-brand" />
              <span>
                {t("aiHint")} <span className="text-xs">(Enter)</span>
              </span>
            </button>
          )}
        </div>

        {/* AI response panel */}
        {aiActive && (
          <AIResponsePanel
            isProcessing={ai.isProcessing}
            message={ai.message}
            actions={ai.actions}
            toolProgress={ai.toolProgress}
            toolResults={ai.toolResults}
            error={ai.error}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
