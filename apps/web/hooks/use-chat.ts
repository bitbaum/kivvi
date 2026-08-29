"use client";

import { useState, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { logger } from "@/lib/logger";

const CHAT_REQUEST_TIMEOUT_MS = 45_000;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolResults?: Array<{
    tool: string;
    result: unknown;
  }>;
}

interface UseChatOptions {
  providerId?: string;
  modelId?: string;
  onError?: (error: Error) => void;
  onFinish?: (message: ChatMessage) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  conversationId: string | null;
  sendMessage: (content?: string) => Promise<void>;
  clearMessages: () => void;
  loadConversation: (id: string) => Promise<void>;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const locale = useLocale();
  const t = useTranslations("ai");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content?: string) => {
      const messageContent = content || input.trim();
      if (!messageContent || isLoading) return;

      // Clear input immediately
      setInput("");

      // Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: messageContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Create placeholder for assistant message
      const assistantId = crypto.randomUUID();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
        toolResults: [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Create abort controller
      abortControllerRef.current = new AbortController();
      let timedOut = false;
      let timeout: number | undefined;
      const resetTimeout = () => {
        if (timeout) window.clearTimeout(timeout);
        timeout = window.setTimeout(() => {
          timedOut = true;
          abortControllerRef.current?.abort();
        }, CHAT_REQUEST_TIMEOUT_MS);
      };
      resetTimeout();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: messageContent,
            conversationId,
            providerId: options.providerId,
            modelId: options.modelId,
            locale,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          resetTimeout();
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              let data: {
                type?: string;
                content?: string;
                conversationId?: string;
                tool?: string;
                result?: unknown;
                error?: string;
              };
              try {
                data = JSON.parse(line.slice(6));
              } catch (parseError) {
                // Ignore parse errors for incomplete JSON
                if (line.length > 6) {
                  logger.warn("Failed to parse SSE data", line);
                }
                continue;
              }

              if (data.type === "text" && data.content) {
                accumulatedContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulatedContent } : m,
                  ),
                );
              } else if (data.type === "tool_result") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolResults: [
                            ...(m.toolResults || []),
                            { tool: data.tool || "", result: data.result },
                          ],
                        }
                      : m,
                  ),
                );
              } else if (data.type === "done") {
                if (data.conversationId) {
                  setConversationId(data.conversationId);
                }
                // Mark message as done streaming
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
                );
                // Call onFinish callback
                const finalMessage = {
                  id: assistantId,
                  role: "assistant" as const,
                  content: accumulatedContent,
                  timestamp: new Date(),
                  isStreaming: false,
                };
                options.onFinish?.(finalMessage);
              } else if (data.type === "error") {
                throw new Error(data.error || "Failed to send message");
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          if (timedOut) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: t("errorTimeout"),
                      isStreaming: false,
                    }
                  : m,
              ),
            );
          } else {
            // Request was cancelled by the user, clean up
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          }
        } else {
          logger.warn("Chat error", error);
          // Show actionable error for provider issues, generic for others
          const errorMsg = error instanceof Error ? error.message : "";
          const isProviderError = errorMsg.includes("No AI provider available");
          const isApiKeyError =
            errorMsg.includes("API key invalid") || errorMsg.includes("Invalid API Key");
          const isUnreachable =
            errorMsg.includes("not reachable") || errorMsg.includes("unreachable");
          let displayError: string;
          if (isProviderError) {
            displayError = t("errorNoProvider");
          } else if (isApiKeyError) {
            displayError = t("errorApiKeyInvalid");
          } else if (isUnreachable) {
            displayError = t("errorUnreachable");
          } else {
            displayError = t("errorGeneric");
          }
          // Update assistant message to show error
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: displayError,
                    isStreaming: false,
                  }
                : m,
            ),
          );
          options.onError?.(error instanceof Error ? error : new Error("Unknown error"));
        }
      } finally {
        if (timeout) window.clearTimeout(timeout);
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [input, isLoading, conversationId, options],
  );

  const clearMessages = useCallback(() => {
    // Cancel any ongoing request
    abortControllerRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setIsLoading(false);
  }, []);

  const loadConversation = useCallback(
    async (id: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/chat?conversationId=${id}`);
        if (!response.ok) {
          throw new Error("Failed to load conversation");
        }

        const data = await response.json();
        setConversationId(id);
        setMessages(
          data.messages.map(
            (m: { id: string; role: string; content: string; createdAt: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content || "",
              timestamp: new Date(m.createdAt),
              isStreaming: false,
            }),
          ),
        );
      } catch (error) {
        logger.warn("Failed to load conversation", error);
        options.onError?.(
          error instanceof Error ? error : new Error("Failed to load conversation"),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [options],
  );

  return {
    messages,
    input,
    setInput,
    isLoading,
    conversationId,
    sendMessage,
    clearMessages,
    loadConversation,
  };
}
