'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ModelSelection {
  providerId: string;
  modelId: string;
}

const STORAGE_KEY = 'kivvi-selected-model';

// Default to a free model
const DEFAULT_MODEL: ModelSelection = {
  providerId: 'openrouter',
  modelId: 'google/gemini-2.0-flash-exp:free',
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
      console.warn('Failed to load model selection:', e);
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
      console.warn('Failed to save model selection:', e);
    }
  }, []);

  return {
    selection,
    selectModel,
    isLoaded,
  };
}
