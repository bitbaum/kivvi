import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
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

export class AnthropicProvider implements AIProvider {
  id = 'anthropic';
  name = 'Anthropic Claude';
  type = 'cloud' as const;

  models: AIModel[] = [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      contextWindow: 200000,
      supportsTools: true,
      supportsVision: true,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      contextWindow: 200000,
      supportsTools: true,
      supportsVision: true,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      contextWindow: 200000,
      supportsTools: true,
      supportsVision: true,
      costPer1kInput: 0.0008,
      costPer1kOutput: 0.004,
    },
  ];

  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.messages.create({
      model: request.model || this.models[0].id,
      max_tokens: request.maxTokens || 4096,
      system: request.systemPrompt,
      messages: this.formatMessages(request.messages),
      tools: request.tools?.map((t) => this.formatTool(t)),
      temperature: request.temperature,
    });

    return this.parseResponse(response);
  }

  async *streamChat(request: ChatRequest): AsyncIterable<StreamChunk> {
    const stream = this.client.messages.stream({
      model: request.model || this.models[0].id,
      max_tokens: request.maxTokens || 4096,
      system: request.systemPrompt,
      messages: this.formatMessages(request.messages),
      tools: request.tools?.map((t) => this.formatTool(t)),
      temperature: request.temperature,
    });

    for await (const event of stream) {
      const chunk = this.parseStreamEvent(event);
      if (chunk) yield chunk;
    }
  }

  private formatMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((msg): Anthropic.MessageParam => {
        if (msg.role === 'tool') {
          return {
            role: 'user' as const,
            content: [
              {
                type: 'tool_result' as const,
                tool_use_id: msg.toolCallId!,
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              },
            ],
          };
        }

        if (msg.role === 'assistant' && msg.toolCalls?.length) {
          return {
            role: 'assistant' as const,
            content: [
              ...(msg.content
                ? [{ type: 'text' as const, text: msg.content as string }]
                : []),
              ...msg.toolCalls.map((tc) => ({
                type: 'tool_use' as const,
                id: tc.id,
                name: tc.name,
                input: tc.arguments,
              })),
            ],
          };
        }

        return {
          role: msg.role as 'user' | 'assistant',
          content:
            typeof msg.content === 'string'
              ? msg.content
              : msg.content.map((part) =>
                  part.type === 'text'
                    ? { type: 'text' as const, text: part.text! }
                    : // Justified: Anthropic API accepts URL image sources, but SDK v0.24 types only include base64
                      ({
                        type: 'image',
                        source: { type: 'url', url: part.imageUrl! },
                      } as unknown as Anthropic.ImageBlockParam)
                ),
        };
      });
  }

  private formatTool(tool: Tool): Anthropic.Tool {
    // Convert Zod schema to JSON Schema
    const jsonSchema = this.zodToJsonSchema(tool.parameters);

    return {
      name: tool.name,
      description: tool.description,
      input_schema: jsonSchema as Anthropic.Tool.InputSchema,
    };
  }

  private zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
    if (schema instanceof z.ZodObject) {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(schema.shape as z.ZodRawShape)) {
        properties[key] = this.zodToJsonSchema(value);
        if (!value.isOptional()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }
    if (schema instanceof z.ZodString) {
      return { type: 'string', description: schema.description };
    }
    if (schema instanceof z.ZodNumber) {
      return { type: 'number', description: schema.description };
    }
    if (schema instanceof z.ZodBoolean) {
      return { type: 'boolean', description: schema.description };
    }
    if (schema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodToJsonSchema(schema.element),
        description: schema.description,
      };
    }
    if (schema instanceof z.ZodEnum) {
      return { type: 'string', enum: schema.options, description: schema.description };
    }
    if (schema instanceof z.ZodOptional) {
      return this.zodToJsonSchema(schema.unwrap());
    }
    return { type: 'string' };
  }

  private parseResponse(response: Anthropic.Message): ChatResponse {
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  private parseStreamEvent(event: Anthropic.RawMessageStreamEvent): StreamChunk | null {
    if (event.type === 'content_block_start') {
      if (event.content_block.type === 'text') {
        return { type: 'text', content: '' };
      }
      if (event.content_block.type === 'tool_use') {
        return {
          type: 'tool_call_start',
          toolCall: {
            id: event.content_block.id,
            name: event.content_block.name,
          },
        };
      }
    }

    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        return { type: 'text', content: event.delta.text };
      }
      if (event.delta.type === 'input_json_delta') {
        return { type: 'tool_call_delta', content: event.delta.partial_json };
      }
    }

    if (event.type === 'content_block_stop') {
      return { type: 'tool_call_end' };
    }

    if (event.type === 'message_stop') {
      return { type: 'done' };
    }

    return null;
  }
}
