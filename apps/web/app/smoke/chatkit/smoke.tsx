"use client";

import { useState } from "react";
import { ChatInput } from "@/components/chat-widget/chat-input";
import { ChatMessages } from "@/components/chat-widget/chat-messages";
import type { ChatMessage } from "@/hooks/use-chat";

export default function ChatKitSmoke() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    setInput("");
    setMessages([
      {
        id: "smoke-user",
        role: "user",
        content: text,
        timestamp: new Date(),
      },
      {
        id: "smoke-assistant",
        role: "assistant",
        content: `Kivvi received: ${text}`,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <main className="mx-auto flex h-dvh max-w-3xl flex-col">
      <h1 className="p-4 text-xl font-semibold">ChatKit browser smoke</h1>
      <ChatMessages messages={messages} isLoading={false} />
      <div className="border-t bg-card p-4">
        <ChatInput input={input} setInput={setInput} onSend={send} isLoading={false} />
      </div>
    </main>
  );
}
