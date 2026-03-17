import type { AIModel } from "../types";
import { OpenAICompatibleProvider } from "./openai-compatible";

export class OpenRouterProvider extends OpenAICompatibleProvider {
  id = "openrouter";
  name = "OpenRouter";
  type = "openrouter" as const;

  // Free and cheap models available on OpenRouter
  models: AIModel[] = [
    // Free models
    {
      id: "meta-llama/llama-3.2-3b-instruct:free",
      name: "Llama 3.2 3B (Free)",
      contextWindow: 131072,
      supportsTools: false,
      supportsVision: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
    {
      id: "google/gemini-2.0-flash-001",
      name: "Gemini 2.0 Flash",
      contextWindow: 1048576,
      supportsTools: true,
      supportsVision: true,
      costPer1kInput: 0.0001,
      costPer1kOutput: 0.0004,
    },
    // Very cheap models with better capabilities
    {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek Chat",
      contextWindow: 64000,
      supportsTools: true,
      supportsVision: false,
      costPer1kInput: 0.00014,
      costPer1kOutput: 0.00028,
    },
    {
      id: "qwen/qwen-2.5-72b-instruct",
      name: "Qwen 2.5 72B",
      contextWindow: 131072,
      supportsTools: true,
      supportsVision: false,
      costPer1kInput: 0.00035,
      costPer1kOutput: 0.0004,
    },
  ];

  protected baseUrl = "https://openrouter.ai/api/v1";
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  protected getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "HTTP-Referer": "https://kivvi.app",
      "X-Title": "Kivvi ERP",
    };
  }
}
