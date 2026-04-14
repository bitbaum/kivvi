/**
 * Badge color styles per journal entry source type.
 * Imported by journal list page and journal detail page.
 */
export const SOURCE_TYPE_STYLES: Record<string, string> = {
  manual: "bg-neutral/10 text-neutral",
  invoice: "bg-info/10 text-info",
  payment: "bg-success/10 text-success",
};

/** Source type values (SSOT). */
export const SOURCE_TYPES = ['manual', 'invoice', 'payment'] as const;

/** Build translated source type labels from SOURCE_TYPES (SSOT). */
export function getSourceTypeLabels(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(SOURCE_TYPES.map((type) => [type, t(type)]));
}
