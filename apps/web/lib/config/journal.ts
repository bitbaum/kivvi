/**
 * Badge color styles per journal entry source type.
 * Imported by journal list page and journal detail page.
 */
export const SOURCE_TYPE_STYLES: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  invoice: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  payment: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

/** Source type values (SSOT). */
export const SOURCE_TYPES = ['manual', 'invoice', 'payment'] as const;

/** Build translated source type labels from SOURCE_TYPES (SSOT). */
export function getSourceTypeLabels(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(SOURCE_TYPES.map((type) => [type, t(type)]));
}
