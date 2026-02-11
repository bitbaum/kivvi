'use client';

import { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/use-chat';
import { useModelSelection } from '@/hooks/use-model-selection';
import { ModelSelector, type ModelOption } from '@/components/model-selector';

const suggestions = [
  'Show me unpaid invoices',
  'Create an invoice for my last meeting',
  "What's my revenue this month?",
  'Reconcile bank transactions',
];

export default function ChatPage() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const { selection, selectModel, isLoaded } = useModelSelection();

  const {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
  } = useChat({
    providerId: selection.providerId,
    modelId: selection.modelId,
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch available models
  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => setModels(data.models || []))
      .catch((err) => console.error('Failed to load models:', err));
  }, []);

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
    <div className="mx-auto flex h-full max-w-4xl flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold">How can I help you?</h2>
            <p className="mb-8 text-center text-muted-foreground">
              Ask me to create invoices, check payments, generate reports, or
              manage your business.
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
          <div className="space-y-6 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-4',
                  message.role === 'user' && 'flex-row-reverse'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.content ? (
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  ) : message.isStreaming ? (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  ) : null}
                  {message.isStreaming && message.content && (
                    <span className="inline-block h-4 w-1 animate-pulse bg-foreground/50" />
                  )}
                  {/* Show tool results */}
                  {message.toolResults && message.toolResults.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.toolResults.map((tr, idx) => (
                        <div
                          key={idx}
                          className="rounded border bg-background/50 p-2 text-xs"
                        >
                          <span className="font-medium text-primary">{tr.tool}</span>
                          <pre className="mt-1 overflow-auto">
                            {JSON.stringify(tr.result, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:0.2s]" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <ModelSelector
            models={models}
            selectedModel={selection.modelId}
            onModelChange={selectModel}
            disabled={isLoading || !isLoaded}
          />
          <p className="text-xs text-muted-foreground">
            {models.find((m) => m.modelId === selection.modelId)?.isFree
              ? '✓ Free model selected'
              : 'Paid model - API key required'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Kivvi anything..."
            className="flex-1 rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Kivvi can make mistakes. Review important information.
        </p>
      </div>
    </div>
  );
}
