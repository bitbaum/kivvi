import type { AIModel } from "../types";
import { OpenAICompatibleProvider } from "./openai-compatible";

export class OpenRouterProvider extends OpenAICompatibleProvider {
  id = "openrouter";
  name = "OpenRouter";
  type = "openrouter" as const;

  // Free and cheap models available on OpenRouter
  models: AIModel[] = [
    // Free models. Both ids and both context windows come from OpenRouter's
    // live catalogue on 2026-08-27; pricing.prompt reads 0 for each, which is
    // what makes the `:free` suffix true rather than merely present.
    {
      id: "nvidia/nemotron-3-super-120b-a12b:free",
      name: "Nemotron 3 Super 120B (Free)",
      contextWindow: 262144,
      // The id it replaces, `meta-llama/llama-3.2-3b-instruct:free`, was
      // retired AND could not call tools. Kivvi's assistant is a tool loop, so
      // the free tier was doubly unusable: gone, and useless if it came back.
      supportsTools: true,
      supportsVision: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
    {
      id: "nvidia/nemotron-3.5-lightning:free",
      name: "Nemotron 3.5 Lightning (Free)",
      contextWindow: 1000000,
      supportsTools: true,
      // Replaces `google/gemini-2.0-flash-001`, which is retired. That entry
      // claimed vision and was the only one here that did; no FREE replacement
      // was verified to accept image input, so this does not claim it. Nothing
      // in Kivvi reads `supportsVision` today, so the honest value costs
      // nothing — and a false `true` would cost a confusing runtime failure.
      supportsVision: false,
      // It was also the only PAID id in the free section, which is how a
      // free-tier fallback quietly becomes a bill.
      costPer1kInput: 0,
      costPer1kOutput: 0,
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
