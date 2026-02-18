import type { ContactType } from '@kivvi/database';

/**
 * Badge color styles per contact type.
 * Imported by contact detail page and selectable contact table.
 */
export const CONTACT_TYPE_STYLES: Record<ContactType, string> = {
  customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  vendor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  both: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};
