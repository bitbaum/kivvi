import type { AIModel } from '../types';
import { OpenAICompatibleProvider } from './openai-compatible';

export class OpenRouterProvider extends OpenAICompatibleProvider {
  id = 'openrouter';
  name = 'OpenRouter';
  type = 'openrouter' as const;

  // Free and cheap models available on OpenRouter
  models: AIModel[] = [
    // Free models
    {
      id: 'google/gemma-2-9b-it:free',
      name: 'Gemma 2 9B (Free)',
      contextWindow: 8192,
      supportsTools: false,
      supportsVision: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
    {
      id: 'meta-llama/llama-3.2-3b-instruct:free',
      name: 'Llama 3.2 3B (Free)',
      contextWindow: 131072,
      supportsTools: false,
      supportsVision: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
    {
      id: 'microsoft/phi-3-mini-128k-instruct:free',
      name: 'Phi-3 Mini 128K (Free)',
      contextWindow: 128000,
      supportsTools: false,
      supportsVision: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
    {
      id: 'qwen/qwen-2-7b-instruct:free',
      name: 'Qwen 2 7B (Free)',
      contextWindow: 32768,
      supportsTools: false,
      supportsVision: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
    {
      id: 'mistralai/mistral-7b-instruct:free',
      name: 'Mistral 7B (Free)',
      contextWindow: 32768,
      supportsTools: false,
      supportsVision: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
    // Very cheap models with better capabilities
    {
      id: 'google/gemini-2.0-flash-exp:free',
      name: 'Gemini 2.0 Flash (Free)',
      contextWindow: 1048576,
      supportsTools: true,
      supportsVision: true,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek Chat',
      contextWindow: 64000,
      supportsTools: true,
      supportsVision: false,
      costPer1kInput: 0.00014,
      costPer1kOutput: 0.00028,
    },
    {
      id: 'qwen/qwen-2.5-72b-instruct',
      name: 'Qwen 2.5 72B',
      contextWindow: 131072,
      supportsTools: true,
      supportsVision: false,
      costPer1kInput: 0.00035,
      costPer1kOutput: 0.0004,
    },
  ];

  protected baseUrl = 'https://openrouter.ai/api/v1';
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://kivvi.app',
      'X-Title': 'Kivvi ERP',
    };
  }
}
