'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useChat, type ChatMessage } from '@/hooks/use-chat';
import { useModelSelection } from '@/hooks/use-model-selection';
import type { ModelOption } from '@/components/model-selector';

interface ChatWidgetContextValue {
  // Widget state
  isOpen: boolean;
  toggle: () => void;
  open: (message?: string) => void;
  close: () => void;

  // Chat state
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  sendMessage: (content?: string) => Promise<void>;
  clearMessages: () => void;

  // Model state
  models: ModelOption[];
  selection: { providerId: string; modelId: string };
  selectModel: (providerId: string, modelId: string) => void;
  isModelLoaded: boolean;
}

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const { selection, selectModel, isLoaded: isModelLoaded } = useModelSelection();

  const {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    clearMessages,
  } = useChat({
    providerId: selection.providerId,
    modelId: selection.modelId,
    onError: (error) => {
      console.error('Chat widget error:', error);
    },
  });

  // Fetch available models once
  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => setModels(data.models || []))
      .catch((err) => console.error('Failed to load models:', err));
  }, []);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  const open = useCallback((message?: string) => {
    setIsOpen(true);
    if (message) {
      sendMessage(message);
    }
  }, [sendMessage]);

  return (
    <ChatWidgetContext.Provider
      value={{
        isOpen,
        toggle,
        open,
        close,
        messages,
        input,
        setInput,
        isLoading,
        sendMessage,
        clearMessages,
        models,
        selection,
        selectModel,
        isModelLoaded,
      }}
    >
      {children}
    </ChatWidgetContext.Provider>
  );
}

export function useChatWidget() {
  const context = useContext(ChatWidgetContext);
  if (!context) {
    throw new Error('useChatWidget must be used within a ChatWidgetProvider');
  }
  return context;
}
