/**
 * Named sets of inventory item statuses used in business logic.
 * Client-safe: no DB or server dependencies.
 *
 * Imported by:
 * - packages/core/src/domain/inventory-items.ts (sell/gate validation)
 * - packages/core/src/domain/impact.ts (in-stock + disposed counts)
 * - packages/core/src/domain/shop.ts (public shop queries)
 * - apps/web/lib/config/inventory-items.ts (UI filtering, re-exports)
 * - apps/web/app/actions/sellables.ts (sellable item queries)
 * - apps/web/app/actions/integrations.ts (Ricardo listing gate)
 */

/** Item statuses that allow an item to be added to an invoice or POS sale. */
export const SELLABLE_ITEM_STATUSES = [
  "ready_for_sale",
  "listed",
  "reserved",
] as const;

/** Item statuses visible in the public shop / external marketplaces (excludes reserved). */
export const PUBLIC_ITEM_STATUSES = ["ready_for_sale", "listed"] as const;

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
