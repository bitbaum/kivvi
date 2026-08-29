import type {
  AIProvider,
  AIModel,
  ChatRequest,
  ChatResponse,
  Message,
  StreamChunk,
} from "../types";

export class OllamaProvider implements AIProvider {
  id = "ollama";
  name = "Self-Hosted (Ollama)";
  type = "self-hosted" as const;

  models: AIModel[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:11434") {
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }

      const data = await response.json();

      this.models =
        data.models?.map((model: any) => ({
          id: model.name,
          name: model.name,
          contextWindow: this.getContextWindow(model.name),
          supportsTools: this.supportsTools(model.name),
          supportsVision: model.name.includes("vision") || model.name.includes("llava"),
        })) || [];

      if (this.models.length === 0) {
        throw new Error("No Ollama models installed");
      }
    } catch {
      throw new Error("Ollama server not reachable at " + this.baseUrl);
    } finally {
      clearTimeout(timeout);
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model || "qwen2.5:32b",
        messages: this.formatMessages(request.messages, request.systemPrompt),
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 4096,
        },
      }),
    });

    const data = await response.json();

    return {
      content: data.message?.content || "",
      model: data.model,
      usage: {
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
      },
    };
  }

  async *streamChat(request: ChatRequest): AsyncIterable<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model || "qwen2.5:32b",
        messages: this.formatMessages(request.messages, request.systemPrompt),
        stream: true,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 4096,
        },
      }),
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            yield { type: "text", content: data.message.content };
          }
          if (data.done) {
            yield { type: "done" };
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  private formatMessages(
    messages: Message[],
    systemPrompt?: string,
  ): Array<{ role: string; content: string }> {
    const formatted: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      formatted.push({ role: "system", content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === "system") continue; // Already handled

      formatted.push({
        role: msg.role === "tool" ? "user" : msg.role,
        content:
          typeof msg.content === "string"
            ? msg.content
            : msg.content.map((p) => p.text || "").join("\n"),
      });
    }

    return formatted;
  }

  private getContextWindow(modelName: string): number {
    if (modelName.includes("llama3")) return 128000;
    if (modelName.includes("qwen")) return 32768;
    if (modelName.includes("mistral")) return 32768;
    if (modelName.includes("mixtral")) return 32768;
    return 8192; // Default
  }

  private supportsTools(modelName: string): boolean {
    const toolModels = ["qwen", "llama3", "mistral", "mixtral", "command-r"];
    return toolModels.some((m) => modelName.toLowerCase().includes(m));
  }
}
