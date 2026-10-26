"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { ChatThread, type ThreadLabels } from "@bitbaum/chatkit/react";
import type { ChatMessage } from "@/hooks/use-chat";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  compact?: boolean;
  onReply?: (text: string) => void;
}

export function ChatMessages({ messages, isLoading, compact = false, onReply }: ChatMessagesProps) {
  const t = useTranslations("chat");
  const threadLabels = t.raw("thread") as ThreadLabels;
  const completed = messages
    .filter((message) => !message.isStreaming)
    .map(({ id, role, content }) => ({ id, role, content }));
  const streaming = [...messages].reverse().find((message) => message.isStreaming);
  const loading = isLoading && !streaming;

  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto px-4", compact && "px-3")}>
      <ChatThread
        messages={completed}
        live={streaming ? { text: streaming.content || undefined, status: t("thinking") } : null}
        loading={loading}
        onReply={onReply}
        labels={threadLabels}
        renderLink={({ href, children, ...props }) => (
          <Link href={href} {...props}>
            {children}
          </Link>
        )}
        renderFooter={(message) => {
          const source = messages.find((candidate) => candidate.id === message.id);
          if (!source?.toolResults?.length) return null;
          return (
            <div className="mt-3 space-y-2">
              {source.toolResults.map((toolResult, index) => {
                const result = toolResult.result as
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
                    key={`${toolResult.tool}-${index}`}
                    className="rounded-lg border bg-muted/50 p-3 text-sm"
                  >
                    <span className="font-medium text-primary">{toolResult.tool}</span>
                    {result?.message && <p className="mt-1">{result.message}</p>}
                    {result?.actions?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.actions.map((action, actionIndex) =>
                          action.action === "navigate" && action.params?.url ? (
                            <Link
                              key={`${action.label}-${actionIndex}`}
                              href={action.params.url as string}
                              className={cn(
                                "inline-flex min-h-9 items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                action.variant === "primary" &&
                                  "bg-primary text-primary-foreground hover:bg-primary/90",
                                action.variant === "destructive" &&
                                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                                (!action.variant || action.variant === "default") &&
                                  "border bg-background hover:bg-muted",
                              )}
                            >
                              {action.label}
                            </Link>
                          ) : null,
                        )}
                      </div>
                    ) : null}
                    {!result?.message && !result?.actions && (
                      <pre className="mt-1 overflow-auto">
                        {JSON.stringify(toolResult.result, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }}
        share={false}
        speaker={null}
      />
    </div>
  );
}
