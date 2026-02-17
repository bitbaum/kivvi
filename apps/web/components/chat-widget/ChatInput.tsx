'use client';

import { Send, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function ChatInput({ input, setInput, onSubmit, isLoading, inputRef }: ChatInputProps) {
  const t = useTranslations('chat');

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t('askKivvi')}
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
  );
}
