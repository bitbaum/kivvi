/**
 * Inventory/stock movement option values.
 * Derived from database enum (SSOT: packages/database/src/enums.ts).
 */
import { STOCK_MOVEMENT_TYPE_VALUES } from "@kivvi/database/src/enums";

export const MOVEMENT_TYPES = STOCK_MOVEMENT_TYPE_VALUES;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Build translated movement type labels from MOVEMENT_TYPES (SSOT). */
export function getMovementTypeLabels(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(MOVEMENT_TYPES.map((type) => [type, t(type)]));
}

export const MOVEMENT_TYPE_STYLES: Record<string, string> = {
  purchase: "bg-success/10 text-success",
  sale: "bg-info/10 text-info",
  adjustment: "bg-neutral/10 text-neutral",
  transfer: "bg-tag-purple/10 text-tag-purple",
  return: "bg-warning/10 text-warning",
};
