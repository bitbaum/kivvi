import type { AIModel } from "../types";
import { OpenAICompatibleProvider } from "./openai-compatible";

/**
 * xAI (Grok) provider.
 * Uses OpenAI-compatible API format at https://api.x.ai/v1.
 */
export class XaiProvider extends OpenAICompatibleProvider {
  id = "xai";
  name = "xAI (Grok)";
  type = "cloud" as const;

  models: AIModel[] = [
    {
      id: "grok-3-mini",
      name: "Grok 3 Mini",
      contextWindow: 131072,
      supportsTools: true,
      supportsVision: false,
      costPer1kInput: 0.0003,
      costPer1kOutput: 0.0005,
    },
    {
      id: "grok-3",
      name: "Grok 3",
      contextWindow: 131072,
      supportsTools: true,
      supportsVision: true,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    },
  ];

  protected baseUrl = "https://api.x.ai/v1";
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  protected getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }
}
