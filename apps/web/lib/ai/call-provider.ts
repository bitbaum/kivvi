/**
 * Shared AI provider caller — SSOT for all server-side AI text extraction.
 *
 * Provider priority: GROQ → XAI → OPENROUTER → (ANTHROPIC, opt-in)
 * Falls back to null when no key is configured so callers can degrade gracefully.
 *
 * Usage:
 *   const text = await callAIProvider(systemPrompt, userText);
 *   if (!text) { ...fallback... }
 *
 * ── This SELECTS one provider; it does not chain ─────────────────────────────
 * The header once read "GROQ → XAI → ANTHROPIC → OPENROUTER", which looks like a
 * fallback chain and is not one: `detectProvider` returns the FIRST provider
 * with a key and `callAIProvider` throws if that provider fails. A 429 ends the
 * call — nothing tries the next vendor. Named honestly here so the next reader
 * does not assume a resilience it never had; the real chain lives in
 * `createProviderWithFallback` (@kivvi/ai) and is what /api/chat uses.
 *
 * Anthropic moved BELOW OpenRouter and behind ALLOW_PAID_AI. Ranked third with a
 * key present, it was selected ahead of the free OpenRouter model on every
 * single call — so a key added "just in case" silently became the default payer.
 *
 * ── Model ids come from @kivvi/ai, never from this file ──────────────────────
 * They used to be written inline in the request bodies below, duplicating ids
 * that `packages/ai` already owned. Both copies were retired by their vendors
 * and neither was updated, because a duplicate is only ever noticed by whoever
 * happens to edit the other one. The registry is the single answer now.
 */

import {
  ANTHROPIC_MODELS,
  GROQ_DEFAULT_MODEL,
  OPENROUTER_FALLBACK_MODEL,
} from "@kivvi/ai";

type Provider = "groq" | "xai" | "anthropic" | "openrouter";

function detectProvider(): { provider: Provider; apiKey: string } | null {
  if (process.env.GROQ_API_KEY)
    return { provider: "groq", apiKey: process.env.GROQ_API_KEY };
  if (process.env.XAI_API_KEY)
    return { provider: "xai", apiKey: process.env.XAI_API_KEY };
  if (process.env.OPENROUTER_API_KEY)
    return { provider: "openrouter", apiKey: process.env.OPENROUTER_API_KEY };
  // Paid, and therefore last and opt-in: reaching it means every free option is
  // absent, which is a decision to spend, not a fallback.
  if (process.env.ANTHROPIC_API_KEY && process.env.ALLOW_PAID_AI?.trim())
    return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY };
  return null;
}

export function isAIConfigured(): boolean {
  return detectProvider() !== null;
}

/**
 * Call the configured AI provider with a system prompt and user text.
 * Returns the raw response text, or null if no provider is configured.
 * Throws on network / API errors so callers can catch and fallback.
 */
export async function callAIProvider(
  systemPrompt: string,
  userText: string,
  maxTokens = 1000,
): Promise<string | null> {
  const config = detectProvider();
  if (!config) return null;

  const { provider, apiKey } = config;

  let url: string;
  let headers: Record<string, string>;
  let body: Record<string, unknown>;

  const openaiMessages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userText },
  ];

  if (provider === "groq") {
    url = "https://api.groq.com/openai/v1/chat/completions";
    headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    body = {
      // From the registry in @kivvi/ai, not written out here. This line used to
      // read "llama-3.1-8b-instant" — a copy of an id that lived in the
      // registry too, and Groq retired it. Two places to update meant one place
      // got updated.
      model: GROQ_DEFAULT_MODEL,
      messages: openaiMessages,
      temperature: 0,
      max_tokens: maxTokens,
    };
  } else if (provider === "xai") {
    url = "https://api.x.ai/v1/chat/completions";
    headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    body = {
      model: "grok-3-mini",
      messages: openaiMessages,
      temperature: 0,
      max_tokens: maxTokens,
    };
  } else if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    };
    body = {
      model: ANTHROPIC_MODELS.fast,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
      max_tokens: maxTokens,
    };
  } else {
    url = "https://openrouter.ai/api/v1/chat/completions";
    headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    body = {
      // Likewise: "meta-llama/llama-3.1-8b-instruct:free", also retired. And
      // this is the branch reached only when every free option above is gone,
      // so a stale id here fails at the worst possible moment.
      model: OPENROUTER_FALLBACK_MODEL,
      messages: openaiMessages,
      temperature: 0,
      max_tokens: maxTokens,
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI provider (${provider}) returned ${response.status}`);
  }

  const data = await response.json();

  if (provider === "anthropic") {
    return data.content?.[0]?.text ?? null;
  }
  return data.choices?.[0]?.message?.content ?? null;
}

/** Extract a JSON object from an AI response that may contain markdown fences. */
export function extractJSON<T>(text: string, arrayFallback: true): T[];
export function extractJSON<T>(text: string, arrayFallback?: false): T | null;
export function extractJSON<T>(
  text: string,
  arrayFallback = false,
): T | T[] | null {
  const pattern = arrayFallback ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = text.match(pattern);
  if (!match) return arrayFallback ? [] : null;
  try {
    return JSON.parse(match[0]) as T | T[];
  } catch {
    return arrayFallback ? [] : null;
  }
}
