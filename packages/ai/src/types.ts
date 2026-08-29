import { z } from "zod";

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export interface AIProvider {
  id: string;
  name: string;
  type: "cloud" | "self-hosted" | "openrouter";
  models: AIModel[];
  chat(request: ChatRequest): Promise<ChatResponse>;
  streamChat(request: ChatRequest): AsyncIterable<StreamChunk>;
}

export interface AIModel {
  id: string;
  name: string;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

// ============================================================================
// CHAT TYPES
// ============================================================================

export interface ChatRequest {
  model?: string;
  messages: Message[];
  tools?: Tool[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface StreamChunk {
  type: "text" | "tool_call_start" | "tool_call_delta" | "tool_call_end" | "done";
  content?: string;
  toolCall?: Partial<ToolCall>;
}

export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string | ContentPart[];
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ContentPart {
  type: "text" | "image";
  text?: string;
  imageUrl?: string;
}

// ============================================================================
// TOOL TYPES
// ============================================================================

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
  requiredPermissions: Permission[];
  execute: (params: any, context: ExecutionContext) => Promise<ToolResult>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  actions?: UIAction[];
}

export interface UIAction {
  label: string;
  action: string;
  params?: Record<string, unknown>;
  variant?: "default" | "primary" | "destructive";
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface ExecutionContext {
  userId: string;
  companyId: string;
  userName: string;
  companyName: string;
  vertical: VerticalType;
  permissions: Permission[];
  conversationId: string;
  defaultCurrency: string;
  defaultVatRate: number;
  locale?: string; // User's locale (e.g. 'de-CH', 'fr', 'en') for response language
  db: unknown; // Database instance — typed as unknown to avoid coupling ai package to database package
}

export type VerticalType =
  | "general"
  | "financial-advisory"
  | "legal"
  | "medical"
  | "nonprofit"
  | "retail"
  | "manufacturing";

export type Permission =
  | "invoice:read"
  | "invoice:write"
  | "invoice:delete"
  | "contact:read"
  | "contact:write"
  | "product:read"
  | "product:write"
  | "banking:read"
  | "banking:write"
  | "accounting:read"
  | "accounting:write"
  | "project:read"
  | "project:write"
  | "settings:read"
  | "settings:write";

// ============================================================================
// DECISION ENGINE TYPES
// ============================================================================

export interface AIDecision {
  action: string;
  confidence: number;
  params?: Record<string, unknown>;
  explanation?: string;
  notifyHuman?: boolean;
  question?: string;
  options?: DecisionOption[];
}

export interface DecisionOption {
  label: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface ConfidenceFactors {
  dataCompleteness: number; // 0-1: How complete is the input data
  patternMatch: number; // 0-1: How well does this match known patterns
  ambiguity: number; // 0-1: How ambiguous is the request (lower is better)
  riskLevel: number; // 0-1: How risky is the action (lower is better)
}

export function calculateConfidence(factors: ConfidenceFactors): number {
  const weights = {
    dataCompleteness: 0.3,
    patternMatch: 0.3,
    ambiguity: 0.2,
    riskLevel: 0.2,
  };

  return (
    factors.dataCompleteness * weights.dataCompleteness +
    factors.patternMatch * weights.patternMatch +
    (1 - factors.ambiguity) * weights.ambiguity +
    (1 - factors.riskLevel) * weights.riskLevel
  );
}
