"use client";

import Link from "next/link";
import { Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/hooks/use-chat";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  compact?: boolean;
}

export function ChatMessages({
  messages,
  isLoading,
  scrollRef,
  compact = false,
}: ChatMessagesProps) {
  const t = useTranslations("chat");

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
      <div className={cn("space-y-6", compact ? "space-y-4 py-4" : "py-6")}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-4",
              compact && "gap-3",
              message.role === "user" && "flex-row-reverse",
            )}
          >
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full",
                compact ? "h-6 w-6" : "h-8 w-8",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "brand-gradient text-white",
              )}
            >
              {message.role === "user" ? (
                <User className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
              ) : (
                <Bot className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-3",
                compact && "px-3 py-2",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              {message.content ? (
                message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </p>
                )
              ) : message.isStreaming ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    {t("thinking")}
                  </span>
                </div>
              ) : null}
              {message.isStreaming && message.content && (
                <span className="inline-block h-4 w-1 animate-pulse bg-foreground/50" />
              )}
              {/* Tool results */}
              {message.toolResults && message.toolResults.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.toolResults.map((tr, idx) => {
                    const result = tr.result as
                      | {
                          message?: string;
                          actions?: Array<{
                            label: string;
                            action: string;
                            params?: Record<string, unknown>;
                            variant?: string;
                          }>;
                        }
                      | undefined;
                    return (
                      <div
                        key={idx}
                        className="rounded border bg-background/50 p-2 text-xs"
                      >
                        <span className="font-medium text-primary">
                          {tr.tool}
                        </span>
                        {result?.message && (
                          <p className="mt-1 text-sm">{result.message}</p>
                        )}
                        {result?.actions && result.actions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {result.actions.map((act, actIdx) =>
                              act.action === "navigate" && act.params?.url ? (
                                <Link
                                  key={actIdx}
                                  href={act.params.url as string}
                                  className={cn(
                                    "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                    act.variant === "primary" &&
                                      "bg-primary text-primary-foreground hover:bg-primary/90",
                                    act.variant === "destructive" &&
                                      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                                    (!act.variant ||
                                      act.variant === "default") &&
                                      "border bg-background hover:bg-muted",
                                  )}
                                >
                                  {act.label}
                                </Link>
                              ) : null,
                            )}
                          </div>
                        )}
                        {!result?.message && !result?.actions && (
                          <pre className="mt-1 overflow-auto">
                            {JSON.stringify(tr.result, null, 2)}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-4">
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full brand-gradient text-white",
                compact ? "h-6 w-6" : "h-8 w-8",
              )}
            >
              <Bot className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:0.2s]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
