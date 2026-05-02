/**
 * Named sets of inventory item statuses used in business logic.
 * Client-safe: no DB or server dependencies.
 *
 * Imported by:
 * - packages/core/src/domain/inventory-items.ts (sell/gate validation)
 * - packages/core/src/domain/impact.ts (in-stock + disposed counts)
 * - apps/web/lib/config/inventory-items.ts (UI filtering, re-exports)
 * - apps/web/app/actions/sellables.ts (sellable item queries)
 */

/** Item statuses that allow an item to be added to an invoice or POS sale. */
export const SELLABLE_ITEM_STATUSES = [
  "ready_for_sale",
  "listed",
  "reserved",
] as const;

/** Active pipeline statuses — items still in-progress, not yet sold/disposed. */
export const PIPELINE_ITEM_STATUSES = [
  "intake",
  "testing",
  "repair",
  "ready_for_sale",
  "listed",
  "reserved",
] as const;

/** Terminal statuses for items that have left inventory via a positive outcome. */
export const DISPOSED_ITEM_STATUSES = ["sold", "donated"] as const;
