/**
 * Shared AI provider caller — SSOT for all server-side, non-streaming AI text
 * calls (form assistance, inventory-item extraction).
 *
 * Usage:
 *   const text = await callAIProvider(systemPrompt, userText);
 *   if (!text) { ...fallback... }
 *
 * ── This chains on the REAL call now ──────────────────────────────────────
 * Originally it picked a single provider (`detectProvider`: first with a key
 * present) and threw on that provider's first failure — no retry to the next
 * vendor. A single point of failure for `form-assist`, and a silent quality
 * loss for `ai-extract`, which dropped straight to the regex fallback that
 * only exists for a total AI outage.
 *
 * Routing through `createProviderWithFallback` fixed less of that than this
 * docstring used to claim. That function advances on `validateConnection()` —
 * a `GET /models` probe — so it selected a vendor by asking "can I list your
 * models?" and then made exactly ONE `chat()` call. The claim above, that "a
 * single vendor being down no longer takes either caller down with it", held
 * for a vendor whose /models endpoint is down and for no other way a vendor
 * fails: a 429, a retired model id, or a 200 with empty content was still
 * terminal, with a healthy chain sitting underneath, untried.
 *
 * `chatWithFallback` walks the same order with the real request, so the chain
 * advances on the failure it exists to survive. It also costs one round trip
 * LESS per call, because the completion answers the question the probe was
 * asking. Success and failure still reach the health tracker `/api/health`
 * reads.
 *
 * ── Model ids come from @kivvi/ai, never from this file ──────────────────
 * The chain owns model selection; this file duplicates no provider request
 * bodies and no model ids at all.
 */

import { chatWithFallback, recordAIHealthSuccess, recordAIHealthFailure } from "@kivvi/ai";

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
    const { response } = await chatWithFallback(envConfig(), {
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
