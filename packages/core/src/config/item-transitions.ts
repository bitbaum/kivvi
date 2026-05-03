/**
 * Item status transitions — SSOT for both domain validation and UI config.
 *
 * Rules:
 * - repair always returns to testing (never directly to ready_for_sale)
 *   This enforces re-verification after every repair — structural quality guarantee.
 * - intake can go directly to ready_for_sale (fast path for businesses like Brockenhäuser
 *   that do bulk intake and quick visual assessment without a separate testing step)
 * - ready_for_sale requires gates (enforced in domain/inventory-items.ts):
 *   1. condition !== "untested"
 *   2. askingPrice is set
 *   3. All blocking checklist items passed (if checklist exists)
 *
 * Imported by:
 * - packages/core/src/domain/inventory-items.ts (server-side enforcement)
 * - apps/web/lib/config/inventory-items.ts (UI dropdown filtering)
 *
 * Client-safe: no DB or server dependencies.
 */

import type { ItemStatusValue } from "../../../database/src/enums";

export const ITEM_STATUS_TRANSITIONS: Record<
  ItemStatusValue,
  ItemStatusValue[]
> = {
  // Fast path allowed: intake → ready_for_sale (e.g. Brockenhaus bulk intake)
  intake: ["testing", "ready_for_sale", "recycled"],
  testing: ["repair", "ready_for_sale", "parts_only", "recycled"],
  // repair NEVER goes directly to ready_for_sale — must be re-tested first
  repair: ["testing", "parts_only", "recycled"],
  ready_for_sale: ["listed", "reserved", "donated"],
  listed: ["reserved", "sold", "ready_for_sale"],
  reserved: ["sold", "listed", "ready_for_sale"],
  sold: ["returned"],
  returned: ["testing", "repair", "ready_for_sale", "recycled"],
  donated: [],
  parts_only: ["recycled"],
  recycled: [],
};

/** Document types that trigger inventory item sell on creation.
 * Only invoices constitute a completed sale. Quotes/orders are intentions. */
export const SALES_DOCUMENT_TYPES = ["invoice"] as const;
