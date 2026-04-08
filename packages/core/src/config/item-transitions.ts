/**
 * Item status transitions — SSOT for both domain validation and UI config.
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
  intake: ["testing", "ready_for_sale", "recycled"],
  testing: ["repair", "ready_for_sale", "recycled"],
  repair: ["testing", "ready_for_sale", "recycled"],
  ready_for_sale: ["listed", "reserved", "donated"],
  listed: ["reserved", "sold", "ready_for_sale"],
  reserved: ["sold", "listed", "ready_for_sale"],
  sold: ["returned"],
  returned: ["testing", "repair", "ready_for_sale", "recycled"],
  donated: [],
  recycled: [],
};

/** Document types that trigger inventory item sell on creation */
export const SALES_DOCUMENT_TYPES = ["invoice", "quote", "order"] as const;
