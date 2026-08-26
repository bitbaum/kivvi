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

  // Both ids below were verified present in Groq's live catalogue on
  // 2026-08-27, and both context windows are the vendor's own figure rather
  // than a rounded guess.
  //
  // They replace `llama-3.3-70b-versatile` and `llama-3.1-8b-instant`, which
  // Groq retired along with the rest of the llama-3.x family. Both were listed
  // here, so this provider's ENTIRE model list was dead: every call 404'd with
  // a perfectly valid key, and the fallback below the first model was just a
  // second way to fail.
  //
  // This list is checked daily by dotfiles/scripts/ci/model-pin-audit.mjs,
  // which asks Groq whether these ids still exist. It did not catch the last
  // retirement — the file was never opened, because nothing in its path said
  // "ai" loudly enough — and that gap is now fixed and tested.
  models: AIModel[] = [
    {
      id: "openai/gpt-oss-120b",
      name: "GPT-OSS 120B",
      contextWindow: 131072,
      supportsTools: true,
      supportsVision: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
    {
      id: "openai/gpt-oss-20b",
      name: "GPT-OSS 20B",
      contextWindow: 131072,
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
