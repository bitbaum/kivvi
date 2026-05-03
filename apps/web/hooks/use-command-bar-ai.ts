"use client";

import { useState, useCallback, useRef } from "react";
import { useLocale } from "next-intl";

export interface CommandBarAction {
  label: string;
  action: string;
  params?: Record<string, unknown>;
  variant?: "default" | "primary" | "destructive";
}

export interface CommandBarToolResult {
  tool: string;
  result: {
    success: boolean;
    message?: string;
    data?: unknown;
    actions?: CommandBarAction[];
    error?: string;
  };
}

interface UseCommandBarAIReturn {
  isProcessing: boolean;
  message: string;
  actions: CommandBarAction[];
  toolProgress: string | null;
  toolResults: CommandBarToolResult[];
  error: string | null;
  submit: (query: string) => void;
  cancel: () => void;
  reset: () => void;
}

export function useCommandBarAI(): UseCommandBarAIReturn {
  const locale = useLocale();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [actions, setActions] = useState<CommandBarAction[]>([]);
  const [toolProgress, setToolProgress] = useState<string | null>(null);
  const [toolResults, setToolResults] = useState<CommandBarToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setIsProcessing(false);
    setMessage("");
    setActions([]);
    setToolProgress(null);
    setToolResults([]);
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsProcessing(false);
    setToolProgress(null);
  }, []);

  const submit = useCallback(
    (query: string) => {
      if (!query.trim() || isProcessing) return;

      // Reset state for new query
      setIsProcessing(true);
      setMessage("");
      setActions([]);
      setToolProgress(null);
      setToolResults([]);
      setError(null);

      const abortController = new AbortController();
      abortRef.current = abortController;

      (async () => {
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: query,
              mode: "command",
              locale,
            }),
            signal: abortController.signal,
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Request failed");
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let accumulatedContent = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "text" && data.content) {
                  accumulatedContent += data.content;
                  setMessage(accumulatedContent);
                } else if (data.type === "tool_start") {
                  setToolProgress(data.tool || "processing");
                } else if (data.type === "tool_result") {
                  setToolProgress(null);
                  const result = data.result as CommandBarToolResult["result"];
                  setToolResults((prev) => [
                    ...prev,
                    { tool: data.tool, result },
                  ]);
                  // Collect actions from tool results
                  if (result?.actions) {
                    setActions((prev) => [
                      ...prev,
                      ...(result.actions as CommandBarAction[]),
                    ]);
                  }
                } else if (data.type === "done") {
                  setIsProcessing(false);
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              } catch {
                // Ignore incomplete JSON
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsProcessing(false);
        } finally {
          abortRef.current = null;
        }
      })();
    },
    [isProcessing, locale],
  );

  return {
    isProcessing,
    message,
    actions,
    toolProgress,
    toolResults,
    error,
    submit,
    cancel,
    reset,
  };
}
