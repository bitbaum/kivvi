'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface ModelSelection {
  providerId: string;
  modelId: string;
}

const STORAGE_KEY = 'kivvi-selected-model';

// Default to Groq free model (fastest inference)
const DEFAULT_MODEL: ModelSelection = {
  providerId: 'groq',
  modelId: 'llama-3.3-70b-versatile',
};

// Known model display names for fallback (before API loads)
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'llama-3.1-8b-instant': 'Llama 3.1 8B',
  'gemma2-9b-it': 'Gemma 2 9B',
  'grok-3-mini': 'Grok 3 Mini',
};

export function useModelSelection() {
  const [selection, setSelection] = useState<ModelSelection>(DEFAULT_MODEL);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
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
      logger.warn('Failed to load model selection', e);
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
      logger.warn('Failed to save model selection', e);
    }
  }, []);

  // Derive a display name for the current selection (used as fallback before API loads)
  const displayName = MODEL_DISPLAY_NAMES[selection.modelId] || selection.modelId;

  return {
    selection,
    selectModel,
    isLoaded,
    displayName,
  };
}
