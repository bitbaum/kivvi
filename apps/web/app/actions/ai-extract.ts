"use server";

import { type ActionResult, requireRole, safeErrorMessage } from "./utils";

interface ExtractedItem {
  description: string;
  quantity: string;
}

interface ExtractionResult {
  items: ExtractedItem[];
  rawResponse: string;
}

/**
 * Extract structured line items from natural language text.
 * Uses a simple prompt to the AI provider — no conversation state needed.
 *
 * Examples:
 * "50 Lenovo ThinkCentre M82, 30 Dell OptiPlex 390, 20 HP EliteDesk 800"
 * → [{description: "Lenovo ThinkCentre M82", quantity: "50"}, ...]
 *
 * "Diverse Tastaturen und Mäuse, ca. 200 Stück. 15 Monitore Dell 24 Zoll."
 * → [{description: "Tastaturen und Mäuse (diverse)", quantity: "200"}, {description: 'Monitor Dell 24"', quantity: "15"}]
 */
export async function extractItemsFromTextAction(
  text: string,
): Promise<ActionResult<ExtractionResult>> {
  try {
    await requireRole("member");

    if (!text.trim()) {
      return { success: false, error: "Text is required" };
    }

    // Try to use the AI provider
    const apiKey =
      process.env.GROQ_API_KEY ||
      process.env.XAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Fallback: simple regex-based parsing (no AI available)
      return {
        success: true,
        data: { items: parseItemsSimple(text), rawResponse: "regex" },
      };
    }

    // Use Groq for speed (or fallback to others)
    const provider = process.env.GROQ_API_KEY
      ? "groq"
      : process.env.XAI_API_KEY
        ? "xai"
        : process.env.ANTHROPIC_API_KEY
          ? "anthropic"
          : "openrouter";

    const items = await extractWithAI(text, provider, apiKey);
    return { success: true, data: { items, rawResponse: "ai" } };
  } catch (error) {
    // Fallback to simple parsing on any AI error
    try {
      return {
        success: true,
        data: { items: parseItemsSimple(text), rawResponse: "fallback" },
      };
    } catch {
      return {
        success: false,
        error: safeErrorMessage(error, "Failed to extract items"),
      };
    }
  }
}

/** AI-powered extraction using a direct API call (lightweight, no ConversationEngine overhead) */
async function extractWithAI(
  text: string,
  provider: string,
  apiKey: string,
): Promise<ExtractedItem[]> {
  const systemPrompt = `You extract inventory items from natural language text. Return ONLY a JSON array of objects with "description" (string) and "quantity" (string, default "1"). No markdown, no explanation, just the JSON array.

Examples:
Input: "50 Lenovo ThinkCentre M82, 30 Dell OptiPlex"
Output: [{"description":"Lenovo ThinkCentre M82","quantity":"50"},{"description":"Dell OptiPlex","quantity":"30"}]

Input: "Diverse Tastaturen ca 200 Stk, 15 Monitore Dell 24 Zoll"
Output: [{"description":"Tastaturen (diverse)","quantity":"200"},{"description":"Monitor Dell 24 Zoll","quantity":"15"}]

Input: "Ein MacBook Pro 2019, guter Zustand"
Output: [{"description":"MacBook Pro 2019","quantity":"1"}]`;

  let url: string;
  let headers: Record<string, string>;
  let body: Record<string, unknown>;

  if (provider === "groq") {
    url = "https://api.groq.com/openai/v1/chat/completions";
    headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    body = {
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 2000,
    };
  } else if (provider === "xai") {
    url = "https://api.x.ai/v1/chat/completions";
    headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    body = {
      model: "grok-3-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 2000,
    };
  } else if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    };
    body = {
      model: "claude-haiku-4-5-20251001",
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
      temperature: 0,
      max_tokens: 2000,
    };
  } else {
    url = "https://openrouter.ai/api/v1/chat/completions";
    headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    body = {
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 2000,
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const data = await response.json();

  // Extract content from response
  let content: string;
  if (provider === "anthropic") {
    content = data.content?.[0]?.text || "[]";
  } else {
    content = data.choices?.[0]?.message?.content || "[]";
  }

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return parseItemsSimple(text);

  const parsed = JSON.parse(jsonMatch[0]) as Array<{
    description?: string;
    quantity?: string;
  }>;
  return parsed
    .filter((item) => item.description)
    .map((item) => ({
      description: item.description!.trim(),
      quantity: String(item.quantity || "1"),
    }));
}

/** Simple regex/split-based fallback when no AI is available */
function parseItemsSimple(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];

  // Split by newlines, commas, or semicolons
  const lines = text
    .split(/[,;\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    // Try to extract quantity: "50 Lenovo ThinkCentre" or "Lenovo ThinkCentre x50" or "Lenovo ThinkCentre (50)"
    const qtyPrefixMatch = line.match(/^(\d+)\s*[xX×]?\s+(.+)/);
    const qtySuffixMatch = line.match(/(.+?)\s*[xX×]\s*(\d+)\s*$/);
    const qtyParenMatch = line.match(
      /(.+?)\s*\((\d+)\s*(?:Stk?\.?|Stück|pcs?)?\)\s*$/i,
    );
    const qtyStkMatch = line.match(
      /(.+?)\s*(\d+)\s*(?:Stk?\.?|Stück|pcs?)\s*$/i,
    );

    if (qtyPrefixMatch) {
      items.push({
        description: qtyPrefixMatch[2].trim(),
        quantity: qtyPrefixMatch[1],
      });
    } else if (qtySuffixMatch) {
      items.push({
        description: qtySuffixMatch[1].trim(),
        quantity: qtySuffixMatch[2],
      });
    } else if (qtyParenMatch) {
      items.push({
        description: qtyParenMatch[1].trim(),
        quantity: qtyParenMatch[2],
      });
    } else if (qtyStkMatch) {
      items.push({
        description: qtyStkMatch[1].trim(),
        quantity: qtyStkMatch[2],
      });
    } else {
      items.push({ description: line, quantity: "1" });
    }
  }

  return items;
}
