/**
 * Chart of accounts configuration.
 * Derived from database enum (SSOT: packages/database/src/enums.ts).
 */
import { ACCOUNT_TYPE_VALUES } from "@kivvi/database/src/enums";

export const ACCOUNT_TYPES = ACCOUNT_TYPE_VALUES;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Translation key mapping for account types (plural forms used in i18n) */
export const ACCOUNT_TYPE_LABEL_KEYS: Record<AccountType, string> = {
  asset: "assets",
  liability: "liabilities",
  equity: "equity",
  revenue: "revenue",
  expense: "expenses",
};

export const ACCOUNT_TYPE_STYLES: Record<AccountType, string> = {
  asset: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  liability: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  equity:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  revenue:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  expense:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};
