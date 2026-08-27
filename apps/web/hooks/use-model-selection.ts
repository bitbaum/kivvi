"use client";

import { useState, useEffect, useCallback } from "react";
import { GroqProvider } from "@kivvi/ai/src/providers/groq";
import { OpenRouterProvider } from "@kivvi/ai/src/providers/openrouter";
import { XaiProvider } from "@kivvi/ai/src/providers/xai";
import { logger } from "@/lib/logger";

export interface ModelSelection {
  providerId: string;
  modelId: string;
}

const STORAGE_KEY = "kivvi-selected-model";

/**
 * Both of these come from the registry in `@kivvi/ai`. Neither is written here.
 *
 * This file used to hold a fourth copy of Kivvi's model knowledge, and it had
 * rotted the furthest. `FALLBACK_MODEL` pinned `llama-3.3-70b-versatile`, gone
 * with the rest of Groq's llama-3.x family, so the model shown before the API
 * responds — and used verbatim if the stored selection is unavailable — named a
 * model that cannot be called. The display table beside it listed five ids of
 * which `gemma2-9b-it` had been decommissioned even earlier.
 *
 * A display name that lags is cosmetic. A fallback id that lags is an outage,
 * and both were in the same untended table.
 *
 * The provider LEAVES are imported rather than the package root on purpose:
 * this is a "use client" hook, and `@kivvi/ai` re-exports the conversation
 * engine, the tool registry and an Anthropic provider that pulls
 * `@anthropic-ai/sdk`. None of that belongs in a browser bundle. Groq,
 * OpenRouter and xAI each import only their types and the shared
 * OpenAI-compatible base.
 */
const [groq, openrouter, xai] = [
  new GroqProvider(""),
  new OpenRouterProvider(""),
  new XaiProvider(""),
];

// Fallback default — used before the API loads, or when the stored model is
// unavailable. First model of the default provider, whatever that now is.
const FALLBACK_MODEL: ModelSelection = {
  providerId: groq.id,
  modelId: groq.models[0].id,
};

// Display names for the same window, keyed by id.
const MODEL_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  [groq, openrouter, xai].flatMap((provider) =>
    provider.models.map((model) => [model.id, model.name]),
  ),
);

export function useModelSelection() {
  const [selection, setSelection] = useState<ModelSelection>(FALLBACK_MODEL);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount, validate against available models
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.providerId && parsed.modelId) {
          setSelection(parsed);
        }
      }
    } catch (e) {
      logger.warn("Failed to load model selection", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when selection changes
  const selectModel = useCallback((providerId: string, modelId: string) => {
    const newSelection = { providerId, modelId };
    setSelection(newSelection);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSelection));
    } catch (e) {
      logger.warn("Failed to save model selection", e);
    }
  }, []);

  // Derive a display name for the current selection (used as fallback before API loads)
  const displayName =
    MODEL_DISPLAY_NAMES[selection.modelId] || selection.modelId;

  return {
    selection,
    selectModel,
    isLoaded,
    displayName,
  };
}
