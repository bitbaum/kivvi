// Chat API route
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { aiConversations, aiMessages, companies, type CompanySettings } from '@kivvi/database';
import { ConversationEngine, createProviderWithFallback, getToolsForPermissions, getBusinessSnapshot, getPermissionsForRole, type ExecutionContext, type Message, type ProviderType } from '@kivvi/ai';
import { eq, and, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_VAT_RATE } from '@/lib/config/vat-rates';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, conversationId, providerId, modelId, locale } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Determine provider and model
    const selectedProvider = (providerId || process.env.AI_PROVIDER || 'openrouter') as ProviderType;
    const selectedModel = modelId || 'google/gemini-2.0-flash-exp:free';

    // Get or create conversation
    let conversation: { id: string; } | undefined;
    let previousMessages: Message[] = [];

    if (conversationId) {
      // Verify conversation belongs to user
      const existing = await db.query.aiConversations.findFirst({
        where: and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, session.user.id)
        ),
      });

      if (!existing) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      conversation = existing;

      // Load previous messages
      const messages = await db.query.aiMessages.findMany({
        where: eq(aiMessages.conversationId, conversationId),
        orderBy: [aiMessages.createdAt],
      });

      previousMessages = messages.map((m) => ({
        role: m.role as Message['role'],
        content: m.content || '',
        toolCalls: m.toolCalls as Message['toolCalls'],
        toolCallId: m.toolCallId || undefined,
      }));
    } else {
      // Create new conversation
      const [newConversation] = await db
        .insert(aiConversations)
        .values({
          userId: session.user.id,
          companyId: session.user.companyId,
          title: message.slice(0, 100),
        })
        .returning();

      conversation = newConversation;
    }

    // Save user message to database
    await db.insert(aiMessages).values({
      conversationId: conversation.id,
      role: 'user',
      content: message,
    });

    // Load company settings for vertical and org profile
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, session.user.companyId),
      columns: { settings: true },
    });
    const settings = (company?.settings as CompanySettings) || {};

    // Build execution context
    const context: ExecutionContext = {
      userId: session.user.id,
      companyId: session.user.companyId,
      userName: session.user.name || 'User',
      companyName: session.user.companyName || 'Company',
      vertical: settings.vertical || 'general',
      permissions: getPermissionsForRole(session.user.role || 'member'),
      conversationId: conversation.id,
      defaultCurrency: 'CHF',
      defaultVatRate: Number(DEFAULT_VAT_RATE),
      locale: (locale as string) || 'de-CH',
      db,
    };

    // Build business snapshot for system prompt context
    const snapshot = await getBusinessSnapshot(db, session.user.companyId, context.defaultCurrency);

    // Initialize AI provider with fallback chain
    const env = {
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      XAI_API_KEY: process.env.XAI_API_KEY,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    };

    const getApiKey = (provider: ProviderType): string | undefined => {
      switch (provider) {
        case 'groq':
          return process.env.GROQ_API_KEY;
        case 'xai':
          return process.env.XAI_API_KEY;
        case 'anthropic':
          return process.env.ANTHROPIC_API_KEY;
        case 'openrouter':
          return process.env.OPENROUTER_API_KEY;
        default:
          return undefined;
      }
    };

    const { provider, modelId: fallbackModelId } = await createProviderWithFallback(env, {
      type: selectedProvider,
      apiKey: getApiKey(selectedProvider),
      baseUrl: selectedProvider === 'ollama' ? process.env.OLLAMA_BASE_URL : undefined,
      model: selectedModel,
    });

    const activeModel = selectedModel || fallbackModelId;

    // Get tools based on user permissions
    const tools = getToolsForPermissions(context.permissions);

    // Create conversation engine with business snapshot and org profile
    const engine = new ConversationEngine(provider, context, tools, activeModel, snapshot, settings.orgProfile);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';

          const streamGenerator = engine.streamMessage(message, {
            id: conversation!.id,
            messages: previousMessages,
            context,
          });

          for await (const chunk of streamGenerator) {
            if (chunk.type === 'text' && chunk.content) {
              fullContent += chunk.content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`)
              );
            } else if (chunk.type === 'tool_call_start') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'tool_start', tool: chunk.toolCall?.name })}\n\n`)
              );
            } else if (chunk.type === 'tool_result' && 'result' in chunk) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: chunk.toolName, result: chunk.result })}\n\n`)
              );
            } else if (chunk.type === 'done') {
              // Save assistant message to database
              if (fullContent) {
                await db.insert(aiMessages).values({
                  conversationId: conversation!.id,
                  role: 'assistant',
                  content: fullContent,
                });
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId: conversation!.id })}\n\n`)
              );
            }
          }
        } catch (error) {
          logger.error('Stream error', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    logger.error('Chat API error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch conversation history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Get specific conversation
      const conversation = await db.query.aiConversations.findFirst({
        where: and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, session.user.id)
        ),
      });

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      const messages = await db.query.aiMessages.findMany({
        where: eq(aiMessages.conversationId, conversationId),
        orderBy: [aiMessages.createdAt],
      });

      return NextResponse.json({ conversation, messages });
    } else {
      // List all conversations
      const conversations = await db.query.aiConversations.findMany({
        where: eq(aiConversations.userId, session.user.id),
        orderBy: [desc(aiConversations.updatedAt)],
        limit: 50,
      });

      return NextResponse.json({ conversations });
    }
  } catch (error) {
    logger.error('Chat GET error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
