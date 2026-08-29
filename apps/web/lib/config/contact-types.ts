import { CONTACT_TYPE_VALUES } from "@kivvi/database/src/enums";
import type { ContactType } from "@kivvi/database";

/** Contact type values for form selectors — derived from database enum (SSOT) */
export const CONTACT_TYPES = CONTACT_TYPE_VALUES;

/**
 * Badge color styles per contact type.
 * Imported by contact detail page and selectable contact table.
 */
export const CONTACT_TYPE_STYLES: Record<ContactType, string> = {
  customer: "bg-info/10 text-info",
  vendor: "bg-warning/10 text-warning",
  both: "bg-tag-purple/10 text-tag-purple",
};

/** Build translated contact type labels from CONTACT_TYPES (SSOT). */
export function getContactTypeLabels(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(CONTACT_TYPES.map((type) => [type, t(type)]));
}
