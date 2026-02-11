import type {
  AIProvider,
  AIModel,
  ChatRequest,
  ChatResponse,
  Message,
  StreamChunk,
  Tool,
  ToolCall,
} from '../types';

export class OpenRouterProvider implements AIProvider {
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

  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://kivvi.app',
        'X-Title': 'Kivvi ERP',
      },
      body: JSON.stringify({
        model: request.model || this.models[0].id,
        messages: this.formatMessages(request.messages, request.systemPrompt),
        tools: request.tools?.map((t) => this.formatTool(t)),
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async *streamChat(request: ChatRequest): AsyncIterable<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://kivvi.app',
        'X-Title': 'Kivvi ERP',
      },
      body: JSON.stringify({
        model: request.model || this.models[0].id,
        messages: this.formatMessages(request.messages, request.systemPrompt),
        tools: request.tools?.map((t) => this.formatTool(t)),
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { type: 'done' };
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              yield { type: 'text', content: delta.content };
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.function?.name) {
                  yield {
                    type: 'tool_call_start',
                    toolCall: { id: tc.id, name: tc.function.name },
                  };
                }
                if (tc.function?.arguments) {
                  yield { type: 'tool_call_delta', content: tc.function.arguments };
                }
              }
            }

            if (parsed.choices?.[0]?.finish_reason === 'tool_calls') {
              yield { type: 'tool_call_end' };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  private formatMessages(
    messages: Message[],
    systemPrompt?: string
  ): Array<{ role: string; content: string | any[] }> {
    const formatted: Array<{ role: string; content: string | any[] }> = [];

    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'system') continue;

      if (msg.role === 'tool') {
        formatted.push({
          role: 'tool',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        });
        continue;
      }

      if (msg.role === 'assistant' && msg.toolCalls?.length) {
        formatted.push({
          role: 'assistant',
          content: msg.content as string || '',
        });
        continue;
      }

      formatted.push({
        role: msg.role,
        content:
          typeof msg.content === 'string'
            ? msg.content
            : msg.content.map((p) =>
                p.type === 'text'
                  ? { type: 'text', text: p.text }
                  : { type: 'image_url', image_url: { url: p.imageUrl } }
              ),
      });
    }

    return formatted;
  }

  private formatTool(tool: Tool): any {
    const jsonSchema = this.zodToJsonSchema(tool.parameters);
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: jsonSchema,
      },
    };
  }

  private zodToJsonSchema(schema: any): Record<string, unknown> {
    if (schema._def) {
      const def = schema._def;
      if (def.typeName === 'ZodObject') {
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        for (const [key, value] of Object.entries(def.shape())) {
          properties[key] = this.zodToJsonSchema(value as any);
          if (!(value as any).isOptional?.()) {
            required.push(key);
          }
        }

        return {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined,
        };
      }
      if (def.typeName === 'ZodString') {
        return { type: 'string', description: def.description };
      }
      if (def.typeName === 'ZodNumber') {
        return { type: 'number', description: def.description };
      }
      if (def.typeName === 'ZodBoolean') {
        return { type: 'boolean', description: def.description };
      }
      if (def.typeName === 'ZodArray') {
        return { type: 'array', items: this.zodToJsonSchema(def.type) };
      }
      if (def.typeName === 'ZodEnum') {
        return { type: 'string', enum: def.values };
      }
      if (def.typeName === 'ZodOptional') {
        return this.zodToJsonSchema(def.innerType);
      }
    }
    return { type: 'string' };
  }

  private parseResponse(data: any): ChatResponse {
    const message = data.choices?.[0]?.message;
    const toolCalls: ToolCall[] = [];

    if (message?.tool_calls) {
      for (const tc of message.tool_calls) {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}'),
        });
      }
    }

    return {
      content: message?.content || '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      model: data.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
    };
  }
}
