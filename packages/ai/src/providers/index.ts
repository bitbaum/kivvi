export { AnthropicProvider } from './anthropic';
export { OllamaProvider } from './ollama';
export { OpenRouterProvider } from './openrouter';

import type { AIProvider, AIModel } from '../types';
import { AnthropicProvider } from './anthropic';
import { OllamaProvider } from './ollama';
import { OpenRouterProvider } from './openrouter';

export type ProviderType = 'anthropic' | 'openrouter' | 'ollama';

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
  const anthropic = new AnthropicProvider('');
  const openrouter = new OpenRouterProvider('');
  const ollama = new OllamaProvider();

  const models: ModelConfig[] = [];

  // OpenRouter free models first
  for (const model of openrouter.models) {
    if (model.costPer1kInput === 0) {
      models.push({
        providerId: 'openrouter',
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
      providerId: 'ollama',
      modelId: model.id,
      name: `${model.name} (Local)`,
      isFree: true,
      supportsTools: model.supportsTools,
    });
  }

  // OpenRouter paid models
  for (const model of openrouter.models) {
    if (model.costPer1kInput !== 0) {
      models.push({
        providerId: 'openrouter',
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
      providerId: 'anthropic',
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
    case 'anthropic':
      if (!config.apiKey) throw new Error('Anthropic API key required');
      return new AnthropicProvider(config.apiKey);

    case 'openrouter':
      if (!config.apiKey) throw new Error('OpenRouter API key required');
      return new OpenRouterProvider(config.apiKey);

    case 'ollama':
      const ollamaProvider = new OllamaProvider(config.baseUrl);
      await ollamaProvider.initialize();
      return ollamaProvider;

    default:
      throw new Error(`Unknown provider: ${config.type}`);
  }
}
