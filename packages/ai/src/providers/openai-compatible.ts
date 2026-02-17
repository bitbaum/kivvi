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

/**
 * Abstract base class for OpenAI-compatible API providers.
 * Shared by OpenRouter, xAI (Grok), and any future OpenAI-compatible provider.
 */
export abstract class OpenAICompatibleProvider implements AIProvider {
  abstract id: string;
  abstract name: string;
  abstract type: 'cloud' | 'self-hosted' | 'openrouter';
  abstract models: AIModel[];

  protected abstract baseUrl: string;
  protected abstract getHeaders(): Record<string, string>;

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
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
      throw new Error(`${this.name} error: ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async *streamChat(request: ChatRequest): AsyncIterable<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
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
      throw new Error(`${this.name} error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let hasActiveToolCall = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            // If a tool call was in progress, close it before done
            if (hasActiveToolCall) {
              yield { type: 'tool_call_end' };
              hasActiveToolCall = false;
            }
            yield { type: 'done' };
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            const finishReason = parsed.choices?.[0]?.finish_reason;

            if (delta?.content) {
              yield { type: 'text', content: delta.content };
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.function?.name) {
                  // New tool call starting — close previous if any
                  if (hasActiveToolCall) {
                    yield { type: 'tool_call_end' };
                  }
                  hasActiveToolCall = true;
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

            // Close tool call when finish_reason indicates completion
            if (finishReason && hasActiveToolCall) {
              yield { type: 'tool_call_end' };
              hasActiveToolCall = false;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  protected formatMessages(
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
          tool_call_id: msg.toolCallId,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        } as any);
        continue;
      }

      if (msg.role === 'assistant' && msg.toolCalls?.length) {
        formatted.push({
          role: 'assistant',
          content: msg.content as string || '',
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        } as any);
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

  protected formatTool(tool: Tool): any {
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

  protected zodToJsonSchema(schema: any): Record<string, unknown> {
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

  protected parseResponse(data: any): ChatResponse {
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
