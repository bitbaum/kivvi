import type {
  AIProvider,
  Message,
  Tool,
  ToolCall,
  ToolResult,
  ExecutionContext,
  StreamChunk,
} from './types';
import { getSystemPrompt } from './prompts';

export interface ConversationState {
  id: string;
  messages: Message[];
  context: ExecutionContext;
}

export interface EngineResponse {
  content: string;
  toolResults?: Array<{
    toolName: string;
    result: ToolResult;
  }>;
  state: ConversationState;
}

export class ConversationEngine {
  private provider: AIProvider;
  private tools: Tool[];
  private systemPrompt: string;
  private maxIterations = 10;
  private model?: string;

  constructor(
    provider: AIProvider,
    context: ExecutionContext,
    tools: Tool[] = [],
    model?: string
  ) {
    this.provider = provider;
    this.tools = tools;
    this.systemPrompt = getSystemPrompt(context);
    this.model = model;
  }

  async processMessage(
    userMessage: string,
    state: ConversationState
  ): Promise<EngineResponse> {
    // Add user message
    state.messages.push({
      role: 'user',
      content: userMessage,
    });

    const toolResults: Array<{ toolName: string; result: ToolResult }> = [];
    let iterations = 0;

    while (iterations < this.maxIterations) {
      iterations++;

      const response = await this.provider.chat({
        model: this.model,
        messages: state.messages,
        tools: this.tools.length > 0 ? this.tools : undefined,
        systemPrompt: this.systemPrompt,
        temperature: 0.7,
        maxTokens: 4096,
      });

      // No tool calls - we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        state.messages.push({
          role: 'assistant',
          content: response.content,
        });

        return {
          content: response.content,
          toolResults: toolResults.length > 0 ? toolResults : undefined,
          state,
        };
      }

      // Execute tool calls
      state.messages.push({
        role: 'assistant',
        content: response.content || '',
        toolCalls: response.toolCalls,
      });

      for (const toolCall of response.toolCalls) {
        const result = await this.executeTool(toolCall, state.context);
        toolResults.push({ toolName: toolCall.name, result });

        state.messages.push({
          role: 'tool',
          toolCallId: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    throw new Error('Maximum conversation iterations exceeded');
  }

  async *streamMessage(
    userMessage: string,
    state: ConversationState
  ): AsyncIterable<StreamChunk | { type: 'tool_result'; toolName: string; result: ToolResult }> {
    state.messages.push({
      role: 'user',
      content: userMessage,
    });

    const stream = this.provider.streamChat({
      model: this.model,
      messages: state.messages,
      tools: this.tools.length > 0 ? this.tools : undefined,
      systemPrompt: this.systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    let fullContent = '';
    let currentToolCall: Partial<ToolCall> | null = null;
    let toolCallJson = '';

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        fullContent += chunk.content || '';
        yield chunk;
      } else if (chunk.type === 'tool_call_start') {
        currentToolCall = chunk.toolCall || null;
        toolCallJson = '';
        yield chunk;
      } else if (chunk.type === 'tool_call_delta') {
        toolCallJson += chunk.content || '';
      } else if (chunk.type === 'tool_call_end' && currentToolCall) {
        try {
          const args = JSON.parse(toolCallJson);
          const toolCall: ToolCall = {
            id: currentToolCall.id || crypto.randomUUID(),
            name: currentToolCall.name || '',
            arguments: args,
          };

          const result = await this.executeTool(toolCall, state.context);
          yield { type: 'tool_result', toolName: toolCall.name, result };

          state.messages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          console.error('Failed to parse tool call:', error);
        }
        currentToolCall = null;
      } else if (chunk.type === 'done') {
        if (fullContent) {
          state.messages.push({
            role: 'assistant',
            content: fullContent,
          });
        }
        yield chunk;
      }
    }
  }

  private async executeTool(
    toolCall: ToolCall,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const tool = this.tools.find((t) => t.name === toolCall.name);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolCall.name}`,
      };
    }

    try {
      // Validate arguments against schema
      const validatedArgs = tool.parameters.parse(toolCall.arguments);
      return await tool.execute(validatedArgs, context);
    } catch (error) {
      return {
        success: false,
        error: `Error executing ${toolCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  addTool(tool: Tool): void {
    this.tools.push(tool);
  }

  setTools(tools: Tool[]): void {
    this.tools = tools;
  }
}
