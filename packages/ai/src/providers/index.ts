export { AnthropicProvider, ANTHROPIC_MODELS } from "./anthropic";
export { GroqProvider } from "./groq";
export { OllamaProvider } from "./ollama";
export { OpenRouterProvider } from "./openrouter";
export { XaiProvider } from "./xai";
export { OpenAICompatibleProvider } from "./openai-compatible";

import type { AIProvider } from "../types";
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

export async function createProvider(
  config: ProviderConfig,
): Promise<AIProvider> {
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
 * Priority: preferred → groq → xai → openrouter → ollama → anthropic.
 * Returns the first provider that can be initialized AND validated.
 */
export async function createProviderWithFallback(
  env: {
    GROQ_API_KEY?: string;
    XAI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    OLLAMA_BASE_URL?: string;
  },
  preferred?: ProviderConfig,
): Promise<{
  provider: AIProvider;
  providerId: ProviderType;
  modelId: string;
}> {
  const errors: string[] = [];

  // Try preferred provider first
  if (preferred) {
    try {
      const provider = await createProvider(preferred);
      if (
        "validateConnection" in provider &&
        typeof (provider as any).validateConnection === "function"
      ) {
        await (provider as any).validateConnection();
      }
      return {
        provider,
        providerId: preferred.type,
        modelId: preferred.model || provider.models[0]?.id || "",
      };
    } catch (e) {
      errors.push(
        `${preferred.type}: ${e instanceof Error ? e.message : "failed"}`,
      );
    }
  }

  // Fallback chain: groq → xai → openrouter → ollama → anthropic
  const chain: Array<{
    type: ProviderType;
    apiKey?: string;
    baseUrl?: string;
    defaultModel: string;
  }> = [
    {
      type: "groq",
      apiKey: env.GROQ_API_KEY,
      defaultModel: "llama-3.3-70b-versatile",
    },
    { type: "xai", apiKey: env.XAI_API_KEY, defaultModel: "grok-3-mini" },
    {
      type: "openrouter",
      apiKey: env.OPENROUTER_API_KEY,
      defaultModel: "google/gemini-2.0-flash-001",
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
    },
  ];

  for (const candidate of chain) {
    // Skip if no credentials
    if (candidate.type === "ollama") {
      if (!candidate.baseUrl) continue;
    } else {
      if (!candidate.apiKey) continue;
    }

    try {
      const provider = await createProvider({
        type: candidate.type,
        apiKey: candidate.apiKey,
        baseUrl: candidate.baseUrl,
      });

      // Validate the connection (checks API key validity / server reachability)
      if (
        "validateConnection" in provider &&
        typeof (provider as any).validateConnection === "function"
      ) {
        await (provider as any).validateConnection();
      }

      return {
        provider,
        providerId: candidate.type,
        modelId: candidate.defaultModel,
      };
    } catch (e) {
      errors.push(
        `${candidate.type}: ${e instanceof Error ? e.message : "failed"}`,
      );
      continue;
    }
  }

  const detail = errors.length > 0 ? ` Tried: ${errors.join("; ")}` : "";
  throw new Error(
    `No AI provider available.${detail} Configure a valid API key for at least one provider: GROQ_API_KEY, XAI_API_KEY, OPENROUTER_API_KEY, OLLAMA_BASE_URL, or ANTHROPIC_API_KEY.`,
  );
}
