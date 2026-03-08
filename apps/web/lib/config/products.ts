/**
 * Product form option values (SSOT).
 * Components derive translated labels from these at render time.
 */

/** Product types */
export const PRODUCT_TYPES = ['product', 'service'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Units of measure (Swiss-centric) */
export const UNIT_VALUES = ['piece', 'hour', 'kg', 'm', 'm2', 'm3', 'liter'] as const;
export type UnitValue = (typeof UNIT_VALUES)[number];

/** Build translated product type labels from PRODUCT_TYPES (SSOT). */
export function getProductTypeLabels(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(PRODUCT_TYPES.map((type) => [type, t(type)]));
}
