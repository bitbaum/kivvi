"use server";

import { type ActionResult, requireRole, safeErrorMessage } from "./utils";

export interface ExtractedItem {
  brand: string; // e.g. "Lenovo", "Dell", "HP" — empty if unknown
  model: string; // product name without brand, e.g. "ThinkPad T480"
  quantity: string; // default "1"
  category: string; // laptop|desktop|monitor|tablet|phone|keyboard|mouse|printer|other
  estimatedPrice: string; // CHF, empty if unknown
  // description = brand + model, for backward compat with the document form
  description: string;
}

interface ExtractionResult {
  items: ExtractedItem[];
  rawResponse: string;
}

/**
 * Extract structured line items from natural language text for a secondhand goods intake.
 * Returns brand, model, quantity, category, and estimated price per item.
 *
 * Examples:
 * "50 Lenovo ThinkPad T480, 30 Dell OptiPlex 390"
 * → [{brand:"Lenovo", model:"ThinkPad T480", quantity:"50", category:"laptop", estimatedPrice:""}]
 *
 * "Ein MacBook Pro 2019, 150.-"
 * → [{brand:"Apple", model:"MacBook Pro 2019", quantity:"1", category:"laptop", estimatedPrice:"150"}]
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
      return {
        success: true,
        data: { items: parseItemsSimple(text), rawResponse: "regex" },
      };
    }

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
  const systemPrompt = `You extract inventory items from natural language text for a secondhand goods store.
Return ONLY a JSON array. No markdown, no explanation.

Each item: {"brand","model","quantity","category","estimatedPrice"}
- brand: manufacturer (e.g. "Lenovo", "Dell", "HP", "Apple") or "" if unknown
- model: product name without brand (e.g. "ThinkPad T480", "OptiPlex 390")
- quantity: number as string, default "1"
- category: one of laptop|desktop|monitor|tablet|phone|keyboard|mouse|printer|other
- estimatedPrice: resale price in CHF as string (digits only), "" if unknown

Examples:
Input: "50 Lenovo ThinkPad T480, 30 Dell OptiPlex 390"
Output: [{"brand":"Lenovo","model":"ThinkPad T480","quantity":"50","category":"laptop","estimatedPrice":""},{"brand":"Dell","model":"OptiPlex 390","quantity":"30","category":"desktop","estimatedPrice":""}]

Input: "Ein MacBook Pro 2019, 150.-"
Output: [{"brand":"Apple","model":"MacBook Pro 2019","quantity":"1","category":"laptop","estimatedPrice":"150"}]

Input: "Diverse Tastaturen ca 200 Stk, 15 Monitore Dell 24 Zoll"
Output: [{"brand":"","model":"Tastaturen (diverse)","quantity":"200","category":"keyboard","estimatedPrice":""},{"brand":"Dell","model":"Monitor 24 Zoll","quantity":"15","category":"monitor","estimatedPrice":""}]`;

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
    brand?: string;
    model?: string;
    quantity?: string;
    category?: string;
    estimatedPrice?: string;
  }>;
  return parsed
    .filter((item) => item.brand || item.model)
    .map((item) => {
      const brand = (item.brand || "").trim();
      const model = (item.model || "").trim();
      return {
        brand,
        model,
        description: [brand, model].filter(Boolean).join(" "),
        quantity: String(item.quantity || "1"),
        category: item.category || "other",
        estimatedPrice: item.estimatedPrice || "",
      };
    });
}

function makeItem(description: string, quantity: string): ExtractedItem {
  return {
    brand: "",
    model: description,
    description,
    quantity,
    category: "other",
    estimatedPrice: "",
  };
}

/** Simple regex/split-based fallback when no AI is available */
function parseItemsSimple(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];

  const lines = text
    .split(/[,;\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    const qtyPrefixMatch = line.match(/^(\d+)\s*[xX×]?\s+(.+)/);
    const qtySuffixMatch = line.match(/(.+?)\s*[xX×]\s*(\d+)\s*$/);
    const qtyParenMatch = line.match(
      /(.+?)\s*\((\d+)\s*(?:Stk?\.?|Stück|pcs?)?\)\s*$/i,
    );
    const qtyStkMatch = line.match(
      /(.+?)\s*(\d+)\s*(?:Stk?\.?|Stück|pcs?)\s*$/i,
    );

    if (qtyPrefixMatch) {
      items.push(makeItem(qtyPrefixMatch[2].trim(), qtyPrefixMatch[1]));
    } else if (qtySuffixMatch) {
      items.push(makeItem(qtySuffixMatch[1].trim(), qtySuffixMatch[2]));
    } else if (qtyParenMatch) {
      items.push(makeItem(qtyParenMatch[1].trim(), qtyParenMatch[2]));
    } else if (qtyStkMatch) {
      items.push(makeItem(qtyStkMatch[1].trim(), qtyStkMatch[2]));
    } else {
      items.push(makeItem(line, "1"));
    }
  }

  return items;
}
