/**
 * Can this deployment reach a model RIGHT NOW?
 *
 * `getAIHealth()` reports what happened the last time something in the app
 * happened to call a provider. Straight after a deploy that is `"unknown"`, and
 * "unknown" is what it stays until real traffic arrives — so the one question a
 * deploy needs answered ("did I just ship a working AI path?") is exactly the
 * one it cannot answer.
 *
 * That mattered here in a specific way. Every AI route in this app is behind a
 * session — chat, form assist, extraction — so there was no way to check the
 * provider chain without signing in as a real user and typing at it. A deploy
 * either got exercised by a customer or it did not get checked.
 *
 * ── It probes THIS app's chain, not a parallel one ───────────────────────────
 * `ask` calls `chatWithFallback`, the same function `/api/chat` and
 * `callAIProvider` use. A probe assembled from its own provider list would test
 * a path nothing else takes, and would drift away from this one the first time
 * the chain changed. This cannot: if the chain breaks, the probe breaks.
 *
 * ── Gating and caching are ai-kit's ──────────────────────────────────────────
 * A probe spends real tokens from the same free budget the app's features draw
 * on, so it runs only on `?probe=1` WITH the secret, a success is cached ten
 * minutes (a monitor in a retry loop cannot drain the budget), and a failure is
 * never cached — the point is the truth about right now. With no secret
 * configured the route answers 501 rather than becoming an open endpoint that
 * can spend money.
 */

import { createAiHealthHandler } from "@bitbaum/ai-kit";

import { chatWithFallback, type AIEnv } from "./providers";
import { aiHealthTracker } from "./health";

function env(): AIEnv {
  return {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    // Same flag the chain itself gates on. A probe must never be the thing
    // that reaches a paid link: it runs unattended, which is the worst possible
    // context for an unplanned invoice.
    ALLOW_PAID_AI: process.env.ALLOW_PAID_AI,
  };
}

/**
 * Built lazily. Next evaluates module-level code during the BUILD, where the
 * runtime's keys are absent — an eagerly-built handler would capture that empty
 * environment and report a dead engine forever on a deployment whose keys are
 * fine.
 */
let handler: ((request: Request) => Promise<Response>) | null = null;

export function aiLivenessHandler(request: Request): Promise<Response> {
  handler ??= createAiHealthHandler({
    // A getter, not a value: the handler is built once and reused, so a plain
    // string would be whatever the environment held on the first request —
    // making the secret un-rotatable without a restart, and the route
    // untestable.
    secret: () => process.env.AI_PROBE_SECRET,
    // Shares the tracker the real chat writes to, so one probe also answers the
    // next ordinary /api/health poll instead of dying with this request.
    health: aiHealthTracker,
    ask: async () => {
      const { response, providerId, modelId } = await chatWithFallback(env(), {
        messages: [{ role: "user", content: "What colour is a clear midday sky? One word." }],
        systemPrompt: "Answer with a single word, no punctuation.",
        // Generous on purpose: the chain leads with reasoning models, which
        // spend this budget thinking before emitting a visible token, and an
        // empty completion is treated as a failure. A mean budget would make a
        // healthy deployment report itself dead.
        maxTokens: 256,
        temperature: 0,
      });
      return { text: response.content, id: `${providerId}/${modelId}` };
    },
  });
  return handler(request);
}
