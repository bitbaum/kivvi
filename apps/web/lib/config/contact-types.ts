import { CONTACT_TYPE_VALUES } from "@kivvi/database/src/enums";
import type { ContactType } from "@kivvi/database";

/** Contact type values for form selectors — derived from database enum (SSOT) */
export const CONTACT_TYPES = CONTACT_TYPE_VALUES;

/**
 * Badge color styles per contact type.
 * Imported by contact detail page and selectable contact table.
 */
export const CONTACT_TYPE_STYLES: Record<ContactType, string> = {
  customer: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  vendor:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  both: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

/** Build translated contact type labels from CONTACT_TYPES (SSOT). */
export function getContactTypeLabels(
  t: (key: string) => string,
): Record<string, string> {
  return Object.fromEntries(CONTACT_TYPES.map((type) => [type, t(type)]));
}
