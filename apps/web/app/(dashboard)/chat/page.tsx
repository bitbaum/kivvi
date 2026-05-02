"use client";

import { useRef, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useChat } from "@/hooks/use-chat";
import { useModelSelection } from "@/hooks/use-model-selection";
import { ModelSelector, type ModelOption } from "@/components/model-selector";
import { ChatMessages } from "@/components/chat-widget/ChatMessages";
import { ChatInput } from "@/components/chat-widget/ChatInput";
import { logger } from "@/lib/logger";
import { getAvailableModelsAction } from "@/app/actions/ai-extract";

export default function ChatPage() {
  const t = useTranslations("chat");
  const searchParams = useSearchParams();
  const [models, setModels] = useState<ModelOption[]>([]);
  const { selection, selectModel, isLoaded, displayName } = useModelSelection();
  const [initialQuerySent, setInitialQuerySent] = useState(false);

  const suggestions = [
    t("suggestions.unpaidInvoices"),
    t("suggestions.createInvoice"),
    t("suggestions.revenueThisMonth"),
    t("suggestions.reconcileTransactions"),
  ];

  const { messages, input, setInput, isLoading, sendMessage } = useChat({
    providerId: selection.providerId,
    modelId: selection.modelId,
    onError: (error) => {
      logger.warn("Chat error", error);
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch available models
  useEffect(() => {
    getAvailableModelsAction()
      .then((result) => {
        if (result.success && result.data) setModels(result.data);
      })
      .catch((err) => logger.warn("Failed to load models", err));
  }, []);

  // Handle ?q= query parameter from dashboard links
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !initialQuerySent && isLoaded) {
      setInitialQuerySent(true);
      sendMessage(q);
    }
  }, [searchParams, initialQuerySent, isLoaded, sendMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage();
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col -m-6 h-[calc(100%+3rem)]">
      {/* Messages area */}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full brand-gradient">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-semibold">{t("howCanIHelp")}</h2>
          <p className="mb-8 text-center text-muted-foreground">
            {t("askDescription")}
          </p>

          <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestion(suggestion)}
                disabled={isLoading}
                className="rounded-lg border bg-card p-4 text-left text-sm hover:border-primary hover:bg-muted/50 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          scrollRef={scrollRef}
        />
      )}

      {/* Input area */}
      <div className="border-t bg-card px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <ModelSelector
            models={models}
            selectedModel={selection.modelId}
            onModelChange={selectModel}
            disabled={isLoading || !isLoaded}
            fallbackLabel={displayName}
          />
          {models.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {models.find((m) => m.modelId === selection.modelId)?.isFree
                ? t("freeModelSelected")
                : t("paidModel")}
            </p>
          )}
        </div>
        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {t("canMakeMistakes")}
        </p>
      </div>
    </div>
  );
}
