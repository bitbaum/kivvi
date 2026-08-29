/**
 * Product form option values.
 * Re-exports from core SSOT — do not duplicate values here.
 */
import {
  PRODUCT_TYPE_VALUES,
  UNIT_TYPE_VALUES,
  DEFAULT_UNIT,
} from "@kivvi/core/src/config/product";

export { DEFAULT_UNIT };

/** Product types */
export const PRODUCT_TYPES = PRODUCT_TYPE_VALUES;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Units of measure (Swiss-centric) */
export const UNIT_VALUES = UNIT_TYPE_VALUES;
export type UnitValue = (typeof UNIT_VALUES)[number];

/** Build translated product type labels from PRODUCT_TYPES (SSOT). */
export function getProductTypeLabels(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(PRODUCT_TYPES.map((type) => [type, t(type)]));
}
