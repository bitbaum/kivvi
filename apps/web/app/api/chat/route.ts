// Chat API route
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiConversations, aiMessages } from "@kivvi/database";
import {
  ConversationEngine,
  createProviderWithFallback,
  getToolsForPermissions,
  getBusinessSnapshot,
  getPermissionsForRole,
  COMMAND_BAR_PROMPT,
  type ExecutionContext,
  type Message,
  type ProviderType,
} from "@kivvi/ai";
import { eq, and, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import { getCompanySettings } from "@kivvi/core/src/domain/companies";
import { fetchBusinessSnapshot, getInventoryDashboard } from "@kivvi/core";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

async function buildProviderFailureFallback({
  message,
  companyId,
  locale,
}: {
  message: string;
  companyId: string;
  locale: string;
}): Promise<string> {
  const isGerman = locale.startsWith("de");
  const lower = message.toLowerCase();
  const asksInventory =
    /inventar|inventory|lager|reparatur|repair|status|lage|business|betrieb/.test(lower);

  if (!asksInventory) {
    return isGerman
      ? "Der KI-Anbieter ist im Moment nicht verfügbar. Für betriebliche Fragen kann ich weiterhin Live-Kennzahlen aus Kivvi anzeigen; bitte versuchen Sie die Frage etwas konkreter."
      : "The AI provider is currently unavailable. I can still show live Kivvi business metrics for operational questions; please try a more specific question.";
  }

  const inventory = await getInventoryDashboard(db, companyId, {
    periodDays: 30,
  });
  const business = await fetchBusinessSnapshot(db, companyId);
  const formatMoney = (amount: number | string, currency = DEFAULT_CURRENCY) =>
    `${currency} ${Number(amount).toLocaleString(locale || DEFAULT_LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const formatDate = (date: Date | null) =>
    date
      ? new Date(date).toLocaleDateString(locale || DEFAULT_LOCALE, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : undefined;
  const inventoryStatusLabels: Record<string, { de: string; en: string }> = {
    intake: { de: "Eingang", en: "Intake" },
    testing: { de: "Test", en: "Testing" },
    repair: { de: "Reparatur", en: "Repair" },
    ready_for_sale: { de: "Verkaufsbereit", en: "Ready for sale" },
    listed: { de: "Online inseriert", en: "Listed" },
    sold: { de: "Verkauft", en: "Sold" },
    donated: { de: "Gespendet", en: "Donated" },
    recycled: { de: "Recycelt", en: "Recycled" },
  };
  const documentStatusLabels: Record<string, { de: string; en: string }> = {
    draft: { de: "Entwurf", en: "Draft" },
    sent: { de: "Versendet", en: "Sent" },
    confirmed: { de: "Bestätigt", en: "Confirmed" },
    delivered: { de: "Geliefert", en: "Delivered" },
    paid: { de: "Bezahlt", en: "Paid" },
    partially_paid: { de: "Teilbezahlt", en: "Partially paid" },
    overdue: { de: "Überfällig", en: "Overdue" },
    cancelled: { de: "Storniert", en: "Cancelled" },
  };
  const labelFor = (labels: Record<string, { de: string; en: string }>, key: string) =>
    labels[key]?.[isGerman ? "de" : "en"] || key.replace(/_/g, " ");
  const statusLines = Object.entries(inventory.byStatus)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `- ${labelFor(inventoryStatusLabels, status)}: ${count}`)
    .join("\n");
  const bankLines = business.bankBalances
    .map((account) => {
      const iban = account.iban ? ` (...${account.iban.slice(-4)})` : "";
      return `- ${account.name}${iban}: ${formatMoney(account.balance, account.currency)}`;
    })
    .join("\n");
  const recentLines = business.recentDocuments
    .map((doc) => {
      const due = formatDate(doc.dueDate);
      const dueText = due ? (isGerman ? `, fällig ${due}` : `, due ${due}`) : "";
      const contact = doc.contactName || (isGerman ? "ohne Kontakt" : "no contact");
      return `- ${doc.number}: ${formatMoney(
        doc.total,
        doc.currency,
      )} ${isGerman ? "an" : "to"} ${contact} (${labelFor(
        documentStatusLabels,
        doc.status,
      )}${dueText})`;
    })
    .join("\n");

  if (isGerman) {
    return `Der KI-Anbieter ist im Moment nicht verfügbar, aber hier ist ein Live-Status aus Kivvi:

Inventar:
- ${inventory.unsoldCount} nicht verkaufte Artikel
- Inventarwert: CHF ${inventory.inventoryValue}
- Eingänge der letzten 30 Tage: ${inventory.intakeCount}
- Verkäufe der letzten 30 Tage: ${inventory.soldCount}
- Durchschnittliche Marge: ${inventory.averageMarginPercent}%
- Sell-through: ${inventory.sellThroughRate}%

Status:
${statusLines || "- Keine Inventarstatus gefunden"}

Kontakte und Katalog:
- Aktive Kunden: ${business.customers}
- Aktive Lieferanten: ${business.vendors}
- Produkte: ${business.productCount}
- Dienstleistungen: ${business.serviceCount}

Finanzen:
- Umsatz diesen Monat: ${formatMoney(business.revenueThisMonth)} (${business.revenueThisMonthCount} Rechnungen)
- Umsatz dieses Jahr: ${formatMoney(business.revenueThisYear)}
- Offene Rechnungen: ${business.outstandingCount} (${formatMoney(business.outstandingTotal)})
- Überfällige Rechnungen: ${business.overdueCount} (${formatMoney(business.overdueTotal)})
- Entwürfe: ${business.draftsCount} (${formatMoney(business.draftsTotal)})

Bank:
${bankLines || "- Keine Bankkonten gefunden"}

Letzte Dokumente:
${recentLines || "- Keine aktuellen Dokumente gefunden"}`;
  }

  return `The AI provider is currently unavailable, but here is a live Kivvi status:

Inventory:
- ${inventory.unsoldCount} unsold items
- Inventory value: CHF ${inventory.inventoryValue}
- Intake in the last 30 days: ${inventory.intakeCount}
- Sales in the last 30 days: ${inventory.soldCount}
- Average margin: ${inventory.averageMarginPercent}%
- Sell-through: ${inventory.sellThroughRate}%

Status:
${statusLines || "- No inventory statuses found"}

Contacts and catalog:
- Active customers: ${business.customers}
- Active vendors: ${business.vendors}
- Products: ${business.productCount}
- Services: ${business.serviceCount}

Finance:
- Revenue this month: ${formatMoney(business.revenueThisMonth)} (${business.revenueThisMonthCount} invoices)
- Revenue this year: ${formatMoney(business.revenueThisYear)}
- Outstanding invoices: ${business.outstandingCount} (${formatMoney(business.outstandingTotal)})
- Overdue invoices: ${business.overdueCount} (${formatMoney(business.overdueTotal)})
- Drafts: ${business.draftsCount} (${formatMoney(business.draftsTotal)})

Bank:
${bankLines || "- No bank accounts found"}

Recent documents:
${recentLines || "- No recent documents found"}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationId, providerId, modelId, locale, mode } = body;
    const isCommandMode = mode === "command";

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get or create conversation (skip persistence in command mode)
    let conversation: { id: string } | undefined;
    let previousMessages: Message[] = [];

    if (isCommandMode) {
      // Command bar mode: ephemeral, no DB persistence
      conversation = { id: crypto.randomUUID() };
    } else if (conversationId) {
      // Verify conversation belongs to user
      const existing = await db.query.aiConversations.findFirst({
        where: and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, session.user.id),
        ),
      });

      if (!existing) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      conversation = existing;

      // Load previous messages
      const messages = await db.query.aiMessages.findMany({
        where: eq(aiMessages.conversationId, conversationId),
        orderBy: [aiMessages.createdAt],
      });

      previousMessages = messages.map((m) => ({
        role: m.role as Message["role"],
        content: m.content || "",
        toolCalls: m.toolCalls as Message["toolCalls"],
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

    // Save user message to database (skip in command mode)
    if (!isCommandMode) {
      await db.insert(aiMessages).values({
        conversationId: conversation.id,
        role: "user",
        content: message,
      });
    }

    // Load company settings for vertical and org profile
    const settings = await getCompanySettings(db, session.user.companyId);

    // Determine provider and model — user selection > company settings > env fallback
    const selectedProvider = (providerId || settings.aiProvider || process.env.AI_PROVIDER) as
      ProviderType | undefined;
    const selectedModel = (modelId || settings.aiModel) as string | undefined;

    // Build execution context
    const context: ExecutionContext = {
      userId: session.user.id,
      companyId: session.user.companyId,
      userName: session.user.name || "User",
      companyName: session.user.companyName || "Company",
      vertical: settings.vertical || "general",
      permissions: getPermissionsForRole(session.user.role || "member"),
      conversationId: conversation.id,
      defaultCurrency: DEFAULT_CURRENCY,
      defaultVatRate: Number(DEFAULT_VAT_RATE),
      locale: (locale as string) || DEFAULT_LOCALE,
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
      // Per-company API key takes priority for matching provider
      if (settings.aiApiKey && settings.aiProvider === provider) {
        return settings.aiApiKey;
      }
      switch (provider) {
        case "groq":
          return process.env.GROQ_API_KEY;
        case "xai":
          return process.env.XAI_API_KEY;
        case "anthropic":
          return process.env.ANTHROPIC_API_KEY;
        case "openrouter":
          return process.env.OPENROUTER_API_KEY;
        default:
          return undefined;
      }
    };

    const {
      provider,
      providerId: activeProviderId,
      modelId: fallbackModelId,
    } = await createProviderWithFallback(
      env,
      selectedProvider
        ? {
            type: selectedProvider,
            apiKey: getApiKey(selectedProvider),
            baseUrl: selectedProvider === "ollama" ? process.env.OLLAMA_BASE_URL : undefined,
            model: selectedModel,
          }
        : undefined,
    );

    // Only use the user-selected model if the provider didn't change via fallback
    const activeModel =
      selectedModel && activeProviderId === selectedProvider ? selectedModel : fallbackModelId;

    // Get tools based on user permissions
    const tools = getToolsForPermissions(context.permissions);

    // Create conversation engine with business snapshot and org profile
    const engine = new ConversationEngine(
      provider,
      context,
      tools,
      activeModel,
      snapshot,
      settings.orgProfile,
      isCommandMode ? COMMAND_BAR_PROMPT : undefined,
    );

    // conversation is always assigned by all branches above
    const activeConversationId = conversation.id;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";

          const streamGenerator = engine.streamMessage(message, {
            id: activeConversationId,
            messages: previousMessages,
            context,
          });

          for await (const chunk of streamGenerator) {
            if (chunk.type === "text" && chunk.content) {
              fullContent += chunk.content;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: chunk.content })}\n\n`,
                ),
              );
            } else if (chunk.type === "tool_call_start") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "tool_start", tool: chunk.toolCall?.name })}\n\n`,
                ),
              );
            } else if (chunk.type === "tool_result" && "result" in chunk) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "tool_result", tool: chunk.toolName, result: chunk.result })}\n\n`,
                ),
              );
            } else if (chunk.type === "done") {
              // Save assistant message to database (skip in command mode)
              if (fullContent && !isCommandMode) {
                await db.insert(aiMessages).values({
                  conversationId: activeConversationId,
                  role: "assistant",
                  content: fullContent,
                  model: activeModel || null,
                  tokenCount: Math.ceil(fullContent.length / 4),
                });
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "done", conversationId: activeConversationId })}\n\n`,
                ),
              );
            }
          }
        } catch (error) {
          logger.error("Stream error", error);
          const fallback = await buildProviderFailureFallback({
            message,
            companyId: context.companyId,
            locale: context.locale || DEFAULT_LOCALE,
          });
          if (fallback) {
            if (!isCommandMode) {
              await db.insert(aiMessages).values({
                conversationId: activeConversationId,
                role: "assistant",
                content: fallback,
                model: activeModel || null,
                tokenCount: Math.ceil(fallback.length / 4),
              });
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text", content: fallback })}\n\n`),
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "done", conversationId: activeConversationId })}\n\n`,
              ),
            );
            return;
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Unknown error" })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("Chat API error", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const isProviderError =
      message.includes("No AI provider available") || message.includes("API key invalid");
    return NextResponse.json({ error: message }, { status: isProviderError ? 503 : 500 });
  }
}

// GET endpoint to fetch conversation history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (conversationId) {
      // Get specific conversation
      const conversation = await db.query.aiConversations.findFirst({
        where: and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, session.user.id),
        ),
      });

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
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
    logger.error("Chat GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
