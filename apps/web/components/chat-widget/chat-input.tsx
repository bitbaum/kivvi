"use client";

import { Composer } from "@bitbaum/chatkit/react";
import { useTranslations } from "next-intl";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text: string) => void | Promise<void>;
  isLoading: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  compact?: boolean;
  autoFocus?: boolean;
}

export function ChatInput({
  input,
  setInput,
  onSend,
  isLoading,
  inputRef,
  compact = false,
  autoFocus = false,
}: ChatInputProps) {
  const t = useTranslations("chat");

  return (
    <Composer
      value={input}
      onValueChange={setInput}
      onSend={(text) => onSend(text)}
      placeholder={t("askKivvi")}
      ariaLabel={t("askKivvi")}
      sending={isLoading}
      inputRef={inputRef}
      voice={false}
      density={compact ? "compact" : "comfortable"}
      autoFocus={autoFocus}
    />
  );
}
