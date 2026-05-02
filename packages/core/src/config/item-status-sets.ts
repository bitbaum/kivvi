/**
 * Named sets of inventory item statuses used in business logic.
 * Client-safe: no DB or server dependencies.
 *
 * Imported by:
 * - packages/core/src/domain/inventory-items.ts (sell/gate validation)
 * - apps/web/lib/config/inventory-items.ts (UI filtering)
 * - apps/web/app/actions/sellables.ts (sellable item queries)
 */

/** Item statuses that allow an item to be added to an invoice or POS sale. */
export const SELLABLE_ITEM_STATUSES = [
  "ready_for_sale",
  "listed",
  "reserved",
] as const;
