import { eq, and, sql } from "drizzle-orm";
import { numberSequences } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { IMPORTABLE_DOCUMENT_TYPES } from "../config/document-constants";

export { IMPORTABLE_DOCUMENT_TYPES };

// Default sequence configs per type
const SEQUENCE_DEFAULTS: Record<string, { prefix: string; format: string }> = {
  invoice: { prefix: "RE", format: "{prefix}-{year}-{number:5}" },
  quote: { prefix: "AN", format: "{prefix}-{year}-{number:5}" },
  order: { prefix: "AU", format: "{prefix}-{year}-{number:5}" },
  order_confirmation: { prefix: "AB", format: "{prefix}-{year}-{number:5}" },
  delivery_note: { prefix: "LS", format: "{prefix}-{year}-{number:5}" },
  credit_note: { prefix: "GU", format: "{prefix}-{year}-{number:5}" },
  purchase_order: { prefix: "BE", format: "{prefix}-{year}-{number:5}" },
  purchase_invoice: { prefix: "ER", format: "{prefix}-{year}-{number:5}" },
  dunning: { prefix: "MA", format: "{prefix}-{year}-{number:5}" },
  intake: { prefix: "EI", format: "{prefix}-{year}-{number:5}" },
  contact: { prefix: "K", format: "{prefix}-{number:5}" },
  product: { prefix: "ART", format: "{prefix}-{number:5}" },
  inventory_item: { prefix: "IT", format: "{prefix}-{number:5}" },
};

/**
 * Format a number according to a pattern.
 *
 * Supported placeholders:
 * - {prefix} — the sequence prefix
 * - {year} — current 4-digit year
 * - {number:N} — zero-padded number to N digits
 */
function formatNumber(format: string, prefix: string, num: number): string {
  const year = new Date().getFullYear().toString();

  return format
    .replace("{prefix}", prefix)
    .replace("{year}", year)
    .replace(/\{number:(\d+)\}/, (_, digits) => {
      return num.toString().padStart(parseInt(digits), "0");
    });
}

/**
 * Get next number in a sequence, creating the sequence if it doesn't exist.
 * Uses atomic UPDATE...RETURNING to prevent race conditions.
 */
export async function getNextNumber(
  db: Database,
  companyId: string,
  type: string,
): Promise<string> {
  const defaults = SEQUENCE_DEFAULTS[type];
  if (!defaults) {
    throw new Error(`Unknown sequence type: ${type}`);
  }

  // Atomic increment — returns the number BEFORE incrementing
  const updated = await db
    .update(numberSequences)
    .set({ nextNumber: sql`${numberSequences.nextNumber} + 1` })
    .where(
      and(
        eq(numberSequences.companyId, companyId),
        eq(numberSequences.type, type),
      ),
    )
    .returning({
      usedNumber: sql<number>`${numberSequences.nextNumber} - 1`,
      prefix: numberSequences.prefix,
      format: numberSequences.format,
    });

  if (updated.length === 0) {
    // Row doesn't exist yet — insert with ON CONFLICT DO NOTHING to handle races
    await db
      .insert(numberSequences)
      .values({
        companyId,
        type,
        prefix: defaults.prefix,
        nextNumber: 1,
        format: defaults.format,
      })
      .onConflictDoNothing();

    // Retry the atomic update (now the row exists)
    const retried = await db
      .update(numberSequences)
      .set({ nextNumber: sql`${numberSequences.nextNumber} + 1` })
      .where(
        and(
          eq(numberSequences.companyId, companyId),
          eq(numberSequences.type, type),
        ),
      )
      .returning({
        usedNumber: sql<number>`${numberSequences.nextNumber} - 1`,
        prefix: numberSequences.prefix,
        format: numberSequences.format,
      });

    if (retried.length === 0) {
      throw new Error(`Failed to allocate number for sequence type: ${type}`);
    }

    return formatNumber(
      retried[0].format,
      retried[0].prefix,
      retried[0].usedNumber,
    );
  }

  return formatNumber(
    updated[0].format,
    updated[0].prefix,
    updated[0].usedNumber,
  );
}

/**
 * Initialize all default sequences for a company.
 * Call this when creating a new company.
 */
export async function initializeSequences(
  db: Database,
  companyId: string,
): Promise<void> {
  const types = Object.keys(SEQUENCE_DEFAULTS);

  for (const type of types) {
    const defaults = SEQUENCE_DEFAULTS[type];
    await db
      .insert(numberSequences)
      .values({
        companyId,
        type,
        prefix: defaults.prefix,
        nextNumber: 1,
        format: defaults.format,
      })
      .onConflictDoNothing();
  }
}
