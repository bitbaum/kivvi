export { AnthropicProvider, ANTHROPIC_MODELS } from "./anthropic";
export { GroqProvider } from "./groq";
export { OllamaProvider } from "./ollama";
export { OpenRouterProvider } from "./openrouter";
export { XaiProvider } from "./xai";
export { OpenAICompatibleProvider } from "./openai-compatible";

import type { AIProvider, ChatRequest, ChatResponse } from "../types";
import { AnthropicProvider, ANTHROPIC_MODELS } from "./anthropic";
import { GroqProvider } from "./groq";
import { OllamaProvider } from "./ollama";
import { OpenRouterProvider } from "./openrouter";
import { XaiProvider } from "./xai";
import { AI_PROVIDER_VALUES } from "@kivvi/database/src/enums";

export type ProviderType = (typeof AI_PROVIDER_VALUES)[number];

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/**
 * The OpenRouter model the fallback chain lands on.
 *
 * DERIVED from `OpenRouterProvider.models`, not written out again. It used to be
 * the literal `openai/gpt-oss-20b:free`, and that id has since been retired —
 * so this constant and the provider list beside it disagreed about what
 * OpenRouter serves, while both were wrong in different ways. One list, one
 * answer: the first free model the provider actually offers.
 *
 * The `:free` suffix is load-bearing, not decoration: the id this replaced was
 * once the SAME model routed through the paid tier, one token apart and billed
 * per call. Free-ness is therefore taken from the cost fields rather than from
 * the spelling of the id — a suffix can be typed, a zero has to be meant.
 */
export const OPENROUTER_FALLBACK_MODEL: string = (() => {
  const free = new OpenRouterProvider("").models.find(
    (m) => m.costPer1kInput === 0 && m.costPer1kOutput === 0,
  );
  if (!free) {
    // Not a soft failure. A fallback chain landing on a paid model bills
    // precisely when the free tier is spent and nobody is watching, so this
    // must break the build rather than quietly cost money.
    throw new Error("No free OpenRouter model is configured for the fallback chain");
  }
  return free.id;
})();

/**
 * The model Groq calls by default.
 *
 * Exported for the same reason: `apps/web/lib/ai/call-provider.ts` used to
 * carry its own copy of a Groq id, inline in the request body, which drifted
 * from this list and was retired without anything noticing. One registry.
 */
export const GROQ_DEFAULT_MODEL: string = (() => {
  const [first] = new GroqProvider("").models;
  if (!first) throw new Error("No Groq model is configured");
  return first.id;
})();

export interface ModelConfig {
  providerId: ProviderType;
  modelId: string;
  name: string;
  isFree: boolean;
  supportsTools: boolean;
}

// All available models across providers
export function getAllModels(): ModelConfig[] {
  const groq = new GroqProvider("");
  const xai = new XaiProvider("");
  const anthropic = new AnthropicProvider("");
  const openrouter = new OpenRouterProvider("");
  const ollama = new OllamaProvider();

  const models: ModelConfig[] = [];

  // Groq free models first (fastest inference)
  for (const model of groq.models) {
    models.push({
      providerId: "groq",
      modelId: model.id,
      name: model.name,
      isFree: true,
      supportsTools: model.supportsTools,
    });
  }

  // xAI free models
  for (const model of xai.models) {
    if (model.costPer1kInput === 0) {
      models.push({
        providerId: "xai",
        modelId: model.id,
        name: model.name,
        isFree: true,
        supportsTools: model.supportsTools,
      });
    }
  }

  // OpenRouter free models
  for (const model of openrouter.models) {
    if (model.costPer1kInput === 0) {
      models.push({
        providerId: "openrouter",
        modelId: model.id,
        name: model.name,
        isFree: true,
        supportsTools: model.supportsTools,
      });
    }
  }

  // Ollama (self-hosted = free)
  for (const model of ollama.models) {
    models.push({
      providerId: "ollama",
      modelId: model.id,
      name: `${model.name} (Local)`,
      isFree: true,
      supportsTools: model.supportsTools,
    });
  }

  // xAI paid models
  for (const model of xai.models) {
    if (model.costPer1kInput !== 0) {
      models.push({
        providerId: "xai",
        modelId: model.id,
        name: model.name,
        isFree: false,
        supportsTools: model.supportsTools,
      });
    }
  }

  // OpenRouter paid models
  for (const model of openrouter.models) {
    if (model.costPer1kInput !== 0) {
      models.push({
        providerId: "openrouter",
        modelId: model.id,
        name: model.name,
        isFree: false,
        supportsTools: model.supportsTools,
      });
    }
  }

  // Anthropic (paid)
  for (const model of anthropic.models) {
    models.push({
      providerId: "anthropic",
      modelId: model.id,
      name: model.name,
      isFree: false,
      supportsTools: model.supportsTools,
    });
  }

  return models;
}

export async function createProvider(config: ProviderConfig): Promise<AIProvider> {
  switch (config.type) {
    case "groq":
      if (!config.apiKey) throw new Error("Groq API key required");
      return new GroqProvider(config.apiKey);

    case "xai":
      if (!config.apiKey) throw new Error("xAI API key required");
      return new XaiProvider(config.apiKey);

    case "anthropic":
      if (!config.apiKey) throw new Error("Anthropic API key required");
      return new AnthropicProvider(config.apiKey);

    case "openrouter":
      if (!config.apiKey) throw new Error("OpenRouter API key required");
      return new OpenRouterProvider(config.apiKey);

    case "ollama": {
      const ollamaProvider = new OllamaProvider(config.baseUrl);
      await ollamaProvider.initialize();
      return ollamaProvider;
    }

    default:
      throw new Error(`Unknown provider: ${config.type}`);
  }
}

/**
 * Provider availability info for the UI.
 */
export interface ProviderAvailability {
  id: ProviderType;
  name: string;
  available: boolean;
  models: ModelConfig[];
}

/**
 * Check which providers are available (have API keys or are reachable).
 */
export function getProviderAvailability(env: {
  GROQ_API_KEY?: string;
  XAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OLLAMA_BASE_URL?: string;
}): ProviderAvailability[] {
  const allModels = getAllModels();

  return [
    {
      id: "groq" as const,
      name: "Groq",
      available: !!env.GROQ_API_KEY,
      models: allModels.filter((m) => m.providerId === "groq"),
    },
    {
      id: "xai" as const,
      name: "xAI (Grok)",
      available: !!env.XAI_API_KEY,
      models: allModels.filter((m) => m.providerId === "xai"),
    },
    {
      id: "openrouter" as const,
      name: "OpenRouter",
      available: !!env.OPENROUTER_API_KEY,
      models: allModels.filter((m) => m.providerId === "openrouter"),
    },
    {
      id: "ollama" as const,
      name: "Ollama (Local)",
      available: !!env.OLLAMA_BASE_URL,
      models: allModels.filter((m) => m.providerId === "ollama"),
    },
    {
      id: "anthropic" as const,
      name: "Anthropic",
      available: !!env.ANTHROPIC_API_KEY,
      models: allModels.filter((m) => m.providerId === "anthropic"),
    },
  ];
}

/**
 * Try to create a provider with fallback.
 * Priority: preferred → groq → xai → openrouter → ollama → (anthropic, opt-in).
 * Returns the first provider that can be initialized AND validated.
 *
 * ── Fallback must never silently start spending money ────────────────────────
 * This chain used to END at Anthropic with a paid model, and its OpenRouter
 * link defaulted to `google/gemini-2.0-flash-001` — also paid. So the failure
 * mode of "the free tiers are busy" was not a degraded answer or an honest
 * refusal: it was an invoice, produced by a code path nobody looks at precisely
 * because it only runs when something else broke.
 *
 * A fallback is a reliability mechanism. Paying is a business decision. Wiring
 * the second to the first means the decision gets made by an outage, at the
 * worst moment, without anyone choosing it.
 *
 * Paid links now require ALLOW_PAID_AI to be set. Unset (the default), the
 * chain is free-only and simply runs out — which is the honest outcome, and the
 * one the caller can report to the user.
 */
export interface AIEnv {
  GROQ_API_KEY?: string;
  XAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OLLAMA_BASE_URL?: string;
  /** Opt in to paid links. Absent = free-only, and that is the default. */
  ALLOW_PAID_AI?: string;
}

interface Candidate {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
  /** An explicit caller preference, honoured over `defaultModel`. */
  model?: string;
}

/**
 * The chain, in order, with unusable links already dropped.
 *
 * ONE list, read by both walkers below. Two copies of a provider order drift —
 * and the drift is invisible until the day the two disagree about which vendor
 * is tried second, in the middle of an outage.
 */
function orderedCandidates(
  env: AIEnv,
  preferred?: ProviderConfig,
): { candidates: Candidate[]; skipped: string[] } {
  const allowPaid = Boolean(env.ALLOW_PAID_AI?.trim());

  // Fallback chain: groq → xai → openrouter → ollama → (anthropic, opt-in)
  const chain: Array<Candidate & { paid?: boolean }> = [
    {
      type: "groq",
      apiKey: env.GROQ_API_KEY,
      // From the registry above, not spelled out again. This literal was the
      // last surviving copy of the retired id, sitting in the fallback chain
      // itself — the one place a stale model id is guaranteed to matter.
      defaultModel: GROQ_DEFAULT_MODEL,
    },
    { type: "xai", apiKey: env.XAI_API_KEY, defaultModel: "grok-3-mini" },
    {
      type: "openrouter",
      apiKey: env.OPENROUTER_API_KEY,
      defaultModel: OPENROUTER_FALLBACK_MODEL,
    },
    {
      type: "ollama",
      baseUrl: env.OLLAMA_BASE_URL,
      defaultModel: "llama3.2:latest",
    },
    {
      type: "anthropic",
      apiKey: env.ANTHROPIC_API_KEY,
      defaultModel: ANTHROPIC_MODELS.default,
      paid: true,
    },
  ];

  // Why a link was dropped travels WITH the list. A refusal that says only
  // "no provider available" sends the reader hunting for a missing key that is
  // in fact present and deliberately unused — the single most confusing way
  // this chain can fail, and the reason it is pinned by a test.
  const skipped: string[] = [];

  const usable = chain.filter((candidate) => {
    // A paid link is invisible in normal operation and only reached when the
    // free ones are gone — so it must be opted into, never fallen into.
    if (candidate.paid && !allowPaid) {
      skipped.push(`${candidate.type}: skipped (paid; set ALLOW_PAID_AI to enable)`);
      return false;
    }
    return candidate.type === "ollama" ? Boolean(candidate.baseUrl) : Boolean(candidate.apiKey);
  });

  if (!preferred) return { candidates: usable, skipped };

  // The caller's choice goes first and keeps its model; it is not duplicated
  // further down, because trying the same link twice is not a fallback.
  return {
    candidates: [
      {
        type: preferred.type,
        apiKey: preferred.apiKey,
        baseUrl: preferred.baseUrl,
        defaultModel: preferred.model || "",
        model: preferred.model,
      },
      ...usable.filter((c) => c.type !== preferred.type),
    ],
    skipped,
  };
}

export async function createProviderWithFallback(
  env: AIEnv,
  preferred?: ProviderConfig,
): Promise<{
  provider: AIProvider;
  providerId: ProviderType;
  modelId: string;
}> {
  const { candidates, skipped } = orderedCandidates(env, preferred);
  // Seeded with the links that were never attempted and why, so the refusal
  // below names them too.
  const errors: string[] = [...skipped];

  for (const candidate of candidates) {
    try {
      const provider = await createProvider({
        type: candidate.type,
        apiKey: candidate.apiKey,
        baseUrl: candidate.baseUrl,
      });

      // Validate the connection (checks API key validity / server reachability).
      //
      // Kept HERE, and only here. This function's job is to hand back a
      // provider OBJECT — for streaming, where there is no single response to
      // judge — so a cheap liveness check is the best signal available before
      // returning one. `chatWithFallback` below does not need it: the
      // completion it makes is a strictly better probe, and it is the call the
      // caller wanted anyway.
      if (
        "validateConnection" in provider &&
        typeof (provider as any).validateConnection === "function"
      ) {
        await (provider as any).validateConnection();
      }

      return {
        provider,
        providerId: candidate.type,
        modelId: candidate.model || candidate.defaultModel || provider.models[0]?.id || "",
      };
    } catch (e) {
      errors.push(`${candidate.type}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  const detail = errors.length > 0 ? ` Tried: ${errors.join("; ")}` : "";
  throw new Error(
    `No AI provider available.${detail} Configure a valid API key for at least one provider: GROQ_API_KEY, XAI_API_KEY, OPENROUTER_API_KEY, OLLAMA_BASE_URL, or ANTHROPIC_API_KEY.`,
  );
}

/**
 * Walk the chain with the REAL request, and return the first provider that
 * actually answers.
 *
 * ── Why this exists next to `createProviderWithFallback` ─────────────────────
 * That function advances on `validateConnection()` — a `GET /models` probe. It
 * is a chain in shape, and it advances on a signal unrelated to the failure it
 * needs to survive: "can I list your models?" and "can this model answer right
 * now?" are different questions. Once a provider passed its audition, its
 * single `chat()` call was the end of the road, so a 429, a retired model id or
 * an empty completion took the whole feature down with a healthy chain sitting
 * underneath, untried.
 *
 * `call-provider.ts` says in its own docstring that routing through the chain
 * means "a single vendor being down no longer takes either caller down with
 * it". That was true of a vendor whose /models endpoint is down, and false of
 * every other way a vendor fails — which is most of them. This closes the gap
 * the docstring already promised.
 *
 * It also costs one round trip LESS per call than the audition did, because the
 * completion answers the question the probe was asking.
 *
 * `createProviderWithFallback` stays for streaming, where the caller needs the
 * provider object rather than one response.
 */
export async function chatWithFallback(
  env: Parameters<typeof createProviderWithFallback>[0],
  request: Omit<ChatRequest, "model"> & { model?: string },
  preferred?: ProviderConfig,
): Promise<{ response: ChatResponse; providerId: ProviderType; modelId: string }> {
  const { candidates, skipped } = orderedCandidates(env, preferred);
  // Seeded with the links that were never attempted and why, so the refusal
  // below names them too.
  const errors: string[] = [...skipped];

  for (const candidate of candidates) {
    try {
      const provider = await createProvider({
        type: candidate.type,
        apiKey: candidate.apiKey,
        baseUrl: candidate.baseUrl,
      });
      const modelId = candidate.model || candidate.defaultModel;
      // No `validateConnection` here on purpose. The completion below is a
      // strictly better probe than the one it replaces, and it is the call the
      // caller actually wanted.
      const response = await provider.chat({ ...request, model: modelId });
      return { response, providerId: candidate.type, modelId };
    } catch (e) {
      // Every link's failure, not just the last: "the key is dead" and "one
      // model id rotted" are different problems that used to read the same.
      errors.push(`${candidate.type}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  const detail = errors.length > 0 ? ` Tried: ${errors.join("; ")}` : "";
  throw new Error(
    `No AI provider answered.${detail} Configure a valid API key for at least one provider: GROQ_API_KEY, XAI_API_KEY, OPENROUTER_API_KEY, OLLAMA_BASE_URL, or ANTHROPIC_API_KEY.`,
  );
}
