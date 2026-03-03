'use client';

import { useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, X, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useChatWidget } from '@/hooks/use-chat-widget';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ModelSelector } from '@/components/model-selector';

export function ChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('chat');
  const {
    isOpen,
    toggle,
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
  } = useChatWidget();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+J to toggle, Escape to close
  useKeyboardShortcuts([
    {
      key: 'j',
      metaKey: true,
      callback: toggle,
    },
    {
      key: 'Escape',
      callback: () => {
        if (isOpen) close();
      },
      preventDefault: false,
    },
  ]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Hide on /chat page
  if (pathname === '/chat') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage();
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleExpand = () => {
    close();
    router.push('/chat');
  };

  const suggestions = [
    t('suggestions.unpaidInvoices'),
    t('suggestions.createInvoice'),
    t('suggestions.revenueThisMonth'),
    t('suggestions.reconcileTransactions'),
  ];

  return (
    <>
      {/* FAB - Floating Action Button */}
      <button
        onClick={toggle}
        className={cn(
          'fixed z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg',
          'bg-gradient-to-br from-blue-500 to-indigo-600 text-white',
          'transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'bottom-6 right-6 lg:bottom-6 lg:right-6',
          'motion-reduce:transition-none',
          isOpen && 'pointer-events-none opacity-0'
        )}
        aria-label={t('openAssistant')}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Panel */}
      <div
        role="dialog"
        aria-label={t('title')}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl',
          'transition-all duration-200 origin-bottom-right',
          'motion-reduce:transition-none',
          // Mobile: full screen
          'inset-2 lg:inset-auto',
          // Desktop: fixed size bottom-right
          'lg:bottom-6 lg:right-6 lg:h-[600px] lg:w-[400px]',
          // Animation
          isOpen
            ? 'scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">Kivvi</span>
          <div className="flex-1" />

          {/* Model selector (compact) */}
          <ModelSelector
            models={models}
            selectedModel={selection.modelId}
            onModelChange={selectModel}
            disabled={isLoading || !isModelLoaded}
          />

          {/* New conversation */}
          <button
            onClick={clearMessages}
            className="flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('newConversation')}
            title={t('newConversation')}
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Expand to full page */}
          <button
            onClick={handleExpand}
            className="flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('expandToFullPage')}
            title={t('expandToFullPage')}
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {/* Close */}
          <button
            onClick={close}
            className="flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('closeAssistant')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages or Empty State */}
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">{t('howCanIHelp')}</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {t('askDescription')}
            </p>
            <div className="grid w-full gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  disabled={isLoading}
                  className="rounded-lg border bg-card p-3 text-left text-sm hover:border-primary hover:bg-muted/50 disabled:opacity-50"
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
            compact
          />
        )}

        {/* Input */}
        <div className="border-t px-4 py-3">
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            inputRef={inputRef}
          />
        </div>
      </div>
    </>
  );
}
