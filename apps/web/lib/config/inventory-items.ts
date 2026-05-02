/**
 * Inventory item configuration — SSOT for all item status and condition UI behavior.
 *
 * Styles and labels live here. Transitions live in packages/core/src/config/item-transitions.ts.
 * Every UI component imports from here — no hardcoded maps elsewhere.
 */

import {
  ITEM_STATUS_VALUES,
  ITEM_CONDITION_VALUES,
} from "@kivvi/database/src/enums";
import { ITEM_STATUS_TRANSITIONS } from "@kivvi/core/src/config/item-transitions";
import { SELLABLE_ITEM_STATUSES } from "@kivvi/core/src/config/item-status-sets";

// Derive union types from the authoritative enum arrays
type ItemStatusValue = (typeof ITEM_STATUS_VALUES)[number];
type ItemConditionValue = (typeof ITEM_CONDITION_VALUES)[number];

// ============================================================================
// STATUS CONFIG (UI: labels + styles only — transitions from SSOT)
// ============================================================================

export interface ItemStatusConfig {
  /** i18n key within 'inventory' namespace */
  labelKey: string;
  /** Tailwind classes for badge */
  style: string;
}

// `satisfies` enforces that every ITEM_STATUS_VALUES entry has an entry here.
// TypeScript will error at compile time if a new status is added to the enum
// without a corresponding UI config. The public type includes `| undefined`
// so helpers can safely index with arbitrary strings from the database.
const _statusConfig = {
  intake: {
    labelKey: "statusIntake",
    style: "bg-info/10 text-info",
  },
  testing: {
    labelKey: "statusTesting",
    style: "bg-warning/10 text-warning",
  },
  repair: {
    labelKey: "statusRepair",
    style: "bg-warning/20 text-warning",
  },
  parts_only: {
    labelKey: "statusPartsOnly",
    style: "bg-destructive/10 text-destructive",
  },
  ready_for_sale: {
    labelKey: "statusReadyForSale",
    style: "bg-success/10 text-success",
  },
  listed: {
    labelKey: "statusListed",
    style: "bg-success/20 text-success",
  },
  reserved: {
    labelKey: "statusReserved",
    style: "bg-tag-purple/10 text-tag-purple",
  },
  sold: {
    labelKey: "statusSold",
    style: "bg-neutral/10 text-neutral",
  },
  returned: {
    labelKey: "statusReturned",
    style: "bg-destructive/10 text-destructive",
  },
  donated: {
    labelKey: "statusDonated",
    style: "bg-tag-rose/10 text-tag-rose",
  },
  recycled: {
    labelKey: "statusRecycled",
    style: "bg-neutral/10 text-neutral",
  },
} satisfies Record<ItemStatusValue, ItemStatusConfig>;

export const ITEM_STATUS_CONFIG: Record<string, ItemStatusConfig | undefined> =
  _statusConfig;

/** Active pipeline statuses — items that are in-progress, not yet sold/disposed */
export const PIPELINE_STATUSES = [
  "intake",
  "testing",
  "repair",
  "ready_for_sale",
  "listed",
  "reserved",
] as const satisfies readonly (typeof ITEM_STATUS_VALUES)[number][];

/** Statuses that allow a checklist/condition test to be run on the item */
export const TESTABLE_STATUSES = [
  "intake",
  "testing",
] as const satisfies readonly (typeof ITEM_STATUS_VALUES)[number][];

/** Statuses where a repair workflow is relevant (show repair log section) */
export const REPAIR_STATUSES = [
  "testing",
  "repair",
] as const satisfies readonly (typeof ITEM_STATUS_VALUES)[number][];

// ============================================================================
// CONDITION CONFIG
// ============================================================================

export interface ItemConditionConfig {
  /** i18n key within 'inventory' namespace */
  labelKey: string;
  /** Short code for labels/QR prints */
  shortLabel: string;
  /** Tailwind classes for badge */
  style: string;
}

// `satisfies` enforces that every ITEM_CONDITION_VALUES entry has an entry here.
const _conditionConfig = {
  untested: {
    labelKey: "conditionUntested",
    shortLabel: "?",
    style: "bg-neutral/10 text-neutral",
  },
  like_new: {
    labelKey: "conditionLikeNew",
    shortLabel: "A+",
    style: "bg-success/10 text-success",
  },
  good: {
    labelKey: "conditionGood",
    shortLabel: "A",
    style: "bg-info/10 text-info",
  },
  fair: {
    labelKey: "conditionFair",
    shortLabel: "B",
    style: "bg-warning/10 text-warning",
  },
  poor: {
    labelKey: "conditionPoor",
    shortLabel: "C",
    style: "bg-warning/20 text-warning",
  },
  parts_only: {
    labelKey: "conditionPartsOnly",
    shortLabel: "P",
    style: "bg-destructive/10 text-destructive",
  },
  scrap: {
    labelKey: "conditionScrap",
    shortLabel: "X",
    style: "bg-neutral/20 text-neutral",
  },
} satisfies Record<ItemConditionValue, ItemConditionConfig>;

export const ITEM_CONDITION_CONFIG: Record<
  string,
  ItemConditionConfig | undefined
> = _conditionConfig;

// ============================================================================
// SELLABLE STATUSES — items that can appear on an invoice
// ============================================================================

// Re-export from core SSOT so UI consumers don't need to know the source path.
export { SELLABLE_ITEM_STATUSES } from "@kivvi/core/src/config/item-status-sets";

// ============================================================================
// HELPERS
// ============================================================================

/** Get status style or fallback */
export function getStatusStyle(status: string): string {
  return ITEM_STATUS_CONFIG[status]?.style || "bg-neutral/10 text-neutral";
}

/** Get condition style or fallback */
export function getConditionStyle(condition: string): string {
  return (
    ITEM_CONDITION_CONFIG[condition]?.style || "bg-neutral/10 text-neutral"
  );
}

/** Get label key for a status. Use with t(getStatusLabelKey(status)) */
export function getStatusLabelKey(status: string): string {
  return ITEM_STATUS_CONFIG[status]?.labelKey || status;
}

/** Get label key for a condition */
export function getConditionLabelKey(condition: string): string {
  return ITEM_CONDITION_CONFIG[condition]?.labelKey || condition;
}

/** Get valid next statuses for a given status (SSOT: packages/core/src/config/item-transitions.ts) */
export function getValidTransitions(status: string): string[] {
  return (
    ITEM_STATUS_TRANSITIONS[status as keyof typeof ITEM_STATUS_TRANSITIONS] ||
    []
  );
}

/** Build translated status labels (for dropdowns etc.) */
export function getStatusLabels(
  t: (key: string) => string,
): Record<string, string> {
  return Object.fromEntries(
    ITEM_STATUS_VALUES.map((s) => [s, t(ITEM_STATUS_CONFIG[s]?.labelKey || s)]),
  );
}

/** Build translated condition labels */
export function getConditionLabels(
  t: (key: string) => string,
): Record<string, string> {
  return Object.fromEntries(
    ITEM_CONDITION_VALUES.map((c) => [
      c,
      t(ITEM_CONDITION_CONFIG[c]?.labelKey || c),
    ]),
  );
}
