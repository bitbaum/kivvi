/**
 * Inventory/stock movement option values (SSOT).
 * Components derive translated labels from these at render time.
 */

export const MOVEMENT_TYPES = ['purchase', 'sale', 'adjustment', 'transfer'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];
