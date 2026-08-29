"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { useModelSelection } from "@/hooks/use-model-selection";
import type { ModelOption } from "@/components/model-selector";
import { logger } from "@/lib/logger";
import { getAvailableModelsAction } from "@/app/actions/ai-extract";

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
  modelDisplayName: string;
}

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const {
    selection,
    selectModel,
    isLoaded: isModelLoaded,
    displayName: modelDisplayName,
  } = useModelSelection();

  const { messages, input, setInput, isLoading, sendMessage, clearMessages } = useChat({
    providerId: selection.providerId,
    modelId: selection.modelId,
    onError: (error) => {
      logger.warn("Chat widget error", error);
    },
  });

  // Fetch available models once
  useEffect(() => {
    getAvailableModelsAction()
      .then((result) => {
        if (result.success && result.data) setModels(result.data);
      })
      .catch((err) => logger.warn("Failed to load models", err));
  }, []);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  const open = useCallback(
    (message?: string) => {
      setIsOpen(true);
      if (message) {
        sendMessage(message);
      }
    },
    [sendMessage],
  );

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
        modelDisplayName,
      }}
    >
      {children}
    </ChatWidgetContext.Provider>
  );
}

export function useChatWidget() {
  const context = useContext(ChatWidgetContext);
  if (!context) {
    throw new Error("useChatWidget must be used within a ChatWidgetProvider");
  }
  return context;
}
