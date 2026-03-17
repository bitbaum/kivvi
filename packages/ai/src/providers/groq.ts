import type { AIModel } from "../types";
import { OpenAICompatibleProvider } from "./openai-compatible";

/**
 * Groq provider — fast inference platform with free tier.
 * Uses OpenAI-compatible API at https://api.groq.com/openai/v1.
 * Free tier: generous rate limits on open-source models.
 */
export class GroqProvider extends OpenAICompatibleProvider {
  id = "groq";
  name = "Groq";
  type = "cloud" as const;

  models: AIModel[] = [
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B",
      contextWindow: 128000,
      supportsTools: true,
      supportsVision: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
    {
      id: "llama-3.1-8b-instant",
      name: "Llama 3.1 8B Instant",
      contextWindow: 128000,
      supportsTools: true,
      supportsVision: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
  ];

  protected baseUrl = "https://api.groq.com/openai/v1";
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
