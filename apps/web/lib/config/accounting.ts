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
  asset: "bg-info/10 text-info",
  liability: "bg-destructive/10 text-destructive",
  equity: "bg-tag-purple/10 text-tag-purple",
  revenue: "bg-success/10 text-success",
  expense: "bg-warning/10 text-warning",
};
