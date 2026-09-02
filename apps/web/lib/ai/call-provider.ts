/**
 * Shared AI provider caller — SSOT for all server-side, non-streaming AI text
 * calls (form assistance, inventory-item extraction).
 *
 * Usage:
 *   const text = await callAIProvider(systemPrompt, userText);
 *   if (!text) { ...fallback... }
 *
 * ── This now chains, same as /api/chat ────────────────────────────────────
 * Used to pick a single provider (`detectProvider`: first with a key present)
 * and throw on that provider's first failure — no retry to the next vendor.
 * That was a documented non-chain: honest in its own docstring, but a real
 * single point of failure for `form-assist` (the HTTP caller saw the failure
 * immediately) and a silent AI-quality loss for `ai-extract` (one vendor
 * hiccup dropped straight to the regex fallback that only exists for a total
 * AI outage).
 *
 * `createProviderWithFallback` (@kivvi/ai) is the chain `/api/chat` already
 * uses correctly: groq → xai → openrouter → ollama → anthropic (paid,
 * opt-in behind ALLOW_PAID_AI). Routing through it here means a single
 * vendor being down no longer takes either caller down with it, and success
 * and failure are now reported to the same health tracker `/api/health`
 * already reads — so this exact failure mode stops being invisible.
 *
 * ── Model ids come from @kivvi/ai, never from this file ──────────────────
 * `createProviderWithFallback` owns model selection now; this file no longer
 * duplicates provider request bodies or model ids at all.
 */

import {
  createProviderWithFallback,
  recordAIHealthSuccess,
  recordAIHealthFailure,
} from "@kivvi/ai";

function envConfig() {
  return {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    // Opt in to the paid link, same flag createProviderWithFallback itself
    // gates on. Absent = free-only, same default as everywhere else.
    ALLOW_PAID_AI: process.env.ALLOW_PAID_AI,
  };
}

export function isAIConfigured(): boolean {
  const env = envConfig();
  return Boolean(
    env.GROQ_API_KEY ||
    env.XAI_API_KEY ||
    env.OPENROUTER_API_KEY ||
    env.OLLAMA_BASE_URL ||
    (env.ANTHROPIC_API_KEY && env.ALLOW_PAID_AI?.trim()),
  );
}

/**
 * Call the AI fallback chain with a system prompt and user text.
 * Returns the raw response text, or null if no provider is configured at all.
 * Throws only once every provider in the chain has failed, so callers can
 * catch and degrade — that catch is now reached on a genuine full outage,
 * not on the first vendor's hiccup.
 */
export async function callAIProvider(
  systemPrompt: string,
  userText: string,
  maxTokens = 1000,
): Promise<string | null> {
  if (!isAIConfigured()) return null;

  try {
    const { provider, modelId } = await createProviderWithFallback(envConfig());
    const response = await provider.chat({
      model: modelId,
      messages: [{ role: "user", content: userText }],
      systemPrompt,
      temperature: 0,
      maxTokens,
    });
    recordAIHealthSuccess();
    return response.content ?? null;
  } catch (error) {
    recordAIHealthFailure(error);
    throw error;
  }
}

/** Extract a JSON object from an AI response that may contain markdown fences. */
export function extractJSON<T>(text: string, arrayFallback: true): T[];
export function extractJSON<T>(text: string, arrayFallback?: false): T | null;
export function extractJSON<T>(text: string, arrayFallback = false): T | T[] | null {
  const pattern = arrayFallback ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = text.match(pattern);
  if (!match) return arrayFallback ? [] : null;
  try {
    return JSON.parse(match[0]) as T | T[];
  } catch {
    return arrayFallback ? [] : null;
  }
}
