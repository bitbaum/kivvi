/**
 * Product type and unit constants — SSOT for domain validation and UI config.
 *
 * Client-safe: no DB or server dependencies.
 *
 * Imported by:
 * - packages/core/src/domain/products.ts (Zod enum validation)
 * - apps/web/lib/config/products.ts (UI labels and form options)
 */

export const PRODUCT_TYPE_VALUES = ["product", "service"] as const;
export type ProductTypeValue = (typeof PRODUCT_TYPE_VALUES)[number];

export const UNIT_TYPE_VALUES = [
  "piece",
  "hour",
  "kg",
  "m",
  "m2",
  "m3",
  "liter",
] as const;
export type UnitTypeValue = (typeof UNIT_TYPE_VALUES)[number];

export const DEFAULT_UNIT: UnitTypeValue = "piece";
