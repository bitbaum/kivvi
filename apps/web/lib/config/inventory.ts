/**
 * Inventory/stock movement option values (SSOT).
 * Components derive translated labels from these at render time.
 */

export const MOVEMENT_TYPES = ['purchase', 'sale', 'adjustment', 'transfer'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Build translated movement type labels from MOVEMENT_TYPES (SSOT). */
export function getMovementTypeLabels(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(MOVEMENT_TYPES.map((type) => [type, t(type)]));
}
