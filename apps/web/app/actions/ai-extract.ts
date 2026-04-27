"use server";

import { type ActionResult, requireRole, safeErrorMessage } from "./utils";
import { getTranslations } from "next-intl/server";
import {
  callAIProvider,
  isAIConfigured,
  extractJSON,
} from "@/lib/ai/call-provider";
import type { CreateContactInput } from "@kivvi/core/src/domain/contacts";
import { ITEM_CATEGORIES } from "@kivvi/core/src/config/checklist-templates";

// ============================================================================
// TYPES — derived from domain schemas (SSOT)
// ============================================================================

/**
 * AI-extracted contact fields. Type is Partial<CreateContactInput> so it can
 * never drift from the canonical schema in packages/core/src/domain/contacts.ts.
 */
export type ExtractedContact = Partial<CreateContactInput>;

/**
 * AI-extracted inventory line item. Matches the shape expected by the intake
 * quick-entry form and the document form's product line.
 */
export interface ExtractedItem {
  brand: string;
  model: string;
  /** description = brand + model (display value for the line-item description field) */
  description: string;
  quantity: string;
  category: string;
  estimatedPrice: string;
}

// ============================================================================
// SYSTEM PROMPTS — SSOT for what the AI is asked to do
// ============================================================================

const EXTRACT_ITEMS_PROMPT = `You extract inventory items from natural language text for a secondhand goods store.
Return ONLY a JSON array. No markdown, no explanation.

Each item: {"brand","model","quantity","category","estimatedPrice"}
- brand: manufacturer (e.g. "Lenovo", "Dell", "HP", "Apple") or "" if unknown
- model: product name without brand (e.g. "ThinkPad T480", "OptiPlex 390")
- quantity: number as string, default "1"
- category: one of ${ITEM_CATEGORIES.join("|")}
- estimatedPrice: resale price in CHF as string (digits only), "" if unknown

Examples:
Input: "50 Lenovo ThinkPad T480, 30 Dell OptiPlex 390"
Output: [{"brand":"Lenovo","model":"ThinkPad T480","quantity":"50","category":"laptop","estimatedPrice":""},{"brand":"Dell","model":"OptiPlex 390","quantity":"30","category":"desktop","estimatedPrice":""}]

Input: "Ein MacBook Pro 2019, 150.-"
Output: [{"brand":"Apple","model":"MacBook Pro 2019","quantity":"1","category":"laptop","estimatedPrice":"150"}]

Input: "Diverse Tastaturen ca 200 Stk, 15 Monitore Dell 24 Zoll"
Output: [{"brand":"","model":"Tastaturen (diverse)","quantity":"200","category":"keyboard","estimatedPrice":""},{"brand":"Dell","model":"Monitor 24 Zoll","quantity":"15","category":"monitor","estimatedPrice":""}]`;

const EXTRACT_CONTACT_PROMPT = `You extract structured contact/person data from natural language text.
Return ONLY a JSON object with these optional fields (omit unknown ones):
{"name","firstName","lastName","email","phone","mobile","website","address","postalCode","city","country","vatNumber","notes"}

Rules:
- name: company/organization name (e.g. "Swisscom AG") — only if it's a company name
- firstName/lastName: individual's first and last name
- country: ISO 2-letter code (CH, DE, AT, FR...), default CH if Swiss context
- postalCode: 4 digits for Switzerland
- vatNumber: Swiss UID format like "CHE-123.456.789" if mentioned

Examples:
Input: "Hans Müller, UBS AG, hans.mueller@ubs.com, Bahnhofstrasse 1, 8001 Zürich, +41 44 234 11 11"
Output: {"firstName":"Hans","lastName":"Müller","name":"UBS AG","email":"hans.mueller@ubs.com","address":"Bahnhofstrasse 1","postalCode":"8001","city":"Zürich","country":"CH","phone":"+41 44 234 11 11"}

Input: "Maria Rossi, maria@example.it, +39 02 1234567, Milano"
Output: {"firstName":"Maria","lastName":"Rossi","email":"maria@example.it","phone":"+39 02 1234567","city":"Milano","country":"IT"}`;

// ============================================================================
// SERVER ACTIONS
// ============================================================================

interface ExtractionResult {
  items: ExtractedItem[];
  rawResponse: string;
}

/**
 * Extract structured line items from natural language text for a secondhand
 * goods intake. Returns brand, model, quantity, category, estimated price.
 *
 * Examples:
 *   "50 Lenovo ThinkPad T480, 30 Dell OptiPlex 390"
 *   "Ein MacBook Pro 2019, 150.-"
 */
export async function extractItemsFromTextAction(
  text: string,
): Promise<ActionResult<ExtractionResult>> {
  const t = await getTranslations("ai");
  try {
    await requireRole("member");

    if (!text.trim()) {
      return { success: false, error: t("errorTextRequired") };
    }

    if (!isAIConfigured()) {
      return {
        success: true,
        data: { items: parseItemsSimple(text), rawResponse: "regex" },
      };
    }

    const raw = await callAIProvider(EXTRACT_ITEMS_PROMPT, text, 2000);
    if (!raw) {
      return {
        success: true,
        data: { items: parseItemsSimple(text), rawResponse: "regex" },
      };
    }

    const parsed = extractJSON<{
      brand?: string;
      model?: string;
      quantity?: string;
      category?: string;
      estimatedPrice?: string;
    }>(raw, true);

    const items: ExtractedItem[] = parsed
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
        error: safeErrorMessage(error, t("errorExtractItems")),
      };
    }
  }
}

/**
 * Extract structured contact data from natural language text.
 * Returns a Partial<CreateContactInput> ready to prefill the contact form.
 *
 * Examples:
 *   "Hans Müller, hans@example.com, Zürich, +41 79 123 45 67"
 *   "UBS AG, Bahnhofstrasse 1, 8001 Zürich, CHE-101.329.561 MWST"
 */
export async function extractContactFromTextAction(
  text: string,
): Promise<ActionResult<ExtractedContact>> {
  const t = await getTranslations("ai");
  try {
    await requireRole("member");

    if (!text.trim()) {
      return { success: false, error: t("errorTextRequired") };
    }

    if (!isAIConfigured()) {
      return { success: true, data: {} };
    }

    const raw = await callAIProvider(EXTRACT_CONTACT_PROMPT, text, 500);
    if (!raw) return { success: true, data: {} };

    const contact = extractJSON<ExtractedContact>(raw);
    return { success: true, data: contact ?? {} };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorExtractContact")),
    };
  }
}

// ============================================================================
// REGEX FALLBACK (no AI key required)
// ============================================================================

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
