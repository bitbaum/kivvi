/**
 * Inventory item configuration — SSOT for all item status and condition behavior.
 *
 * Every UI component displaying item status/condition imports from here.
 * No hardcoded style maps or label maps anywhere else.
 *
 * Pattern mirrors document-types.ts for documents.
 */

import {
  ITEM_STATUS_VALUES,
  ITEM_CONDITION_VALUES,
} from "@kivvi/database/src/enums";

// ============================================================================
// STATUS CONFIG
// ============================================================================

export interface ItemStatusConfig {
  /** i18n key within 'inventory' namespace */
  labelKey: string;
  /** Tailwind classes for badge */
  style: string;
  /** Statuses this status can transition to (from domain VALID_TRANSITIONS) */
  validTransitions: string[];
}

export const ITEM_STATUS_CONFIG: Record<string, ItemStatusConfig> = {
  intake: {
    labelKey: "statusIntake",
    style: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    validTransitions: ["testing", "ready_for_sale", "recycled"],
  },
  testing: {
    labelKey: "statusTesting",
    style:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    validTransitions: ["repair", "ready_for_sale", "recycled"],
  },
  repair: {
    labelKey: "statusRepair",
    style:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    validTransitions: ["testing", "ready_for_sale", "recycled"],
  },
  ready_for_sale: {
    labelKey: "statusReadyForSale",
    style:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    validTransitions: ["listed", "reserved", "donated"],
  },
  listed: {
    labelKey: "statusListed",
    style:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    validTransitions: ["reserved", "sold", "ready_for_sale"],
  },
  reserved: {
    labelKey: "statusReserved",
    style:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    validTransitions: ["sold", "listed", "ready_for_sale"],
  },
  sold: {
    labelKey: "statusSold",
    style: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
    validTransitions: ["returned"],
  },
  returned: {
    labelKey: "statusReturned",
    style: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    validTransitions: ["testing", "repair", "ready_for_sale", "recycled"],
  },
  donated: {
    labelKey: "statusDonated",
    style: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
    validTransitions: [],
  },
  recycled: {
    labelKey: "statusRecycled",
    style: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500",
    validTransitions: [],
  },
};

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

export const ITEM_CONDITION_CONFIG: Record<string, ItemConditionConfig> = {
  untested: {
    labelKey: "conditionUntested",
    shortLabel: "?",
    style: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
  like_new: {
    labelKey: "conditionLikeNew",
    shortLabel: "A+",
    style:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  good: {
    labelKey: "conditionGood",
    shortLabel: "A",
    style: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  fair: {
    labelKey: "conditionFair",
    shortLabel: "B",
    style:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  poor: {
    labelKey: "conditionPoor",
    shortLabel: "C",
    style:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  parts_only: {
    labelKey: "conditionPartsOnly",
    shortLabel: "P",
    style: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  scrap: {
    labelKey: "conditionScrap",
    shortLabel: "X",
    style: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-500",
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/** Get status style or fallback */
export function getStatusStyle(status: string): string {
  return ITEM_STATUS_CONFIG[status]?.style || "bg-gray-100 text-gray-700";
}

/** Get condition style or fallback */
export function getConditionStyle(condition: string): string {
  return ITEM_CONDITION_CONFIG[condition]?.style || "bg-gray-100 text-gray-700";
}

/** Get label key for a status. Use with t(getStatusLabelKey(status)) */
export function getStatusLabelKey(status: string): string {
  return ITEM_STATUS_CONFIG[status]?.labelKey || status;
}

/** Get label key for a condition */
export function getConditionLabelKey(condition: string): string {
  return ITEM_CONDITION_CONFIG[condition]?.labelKey || condition;
}

/** Get valid next statuses for a given status */
export function getValidTransitions(status: string): string[] {
  return ITEM_STATUS_CONFIG[status]?.validTransitions || [];
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
