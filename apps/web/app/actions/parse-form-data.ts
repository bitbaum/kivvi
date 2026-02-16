/**
 * Convert FormData into a plain object, trimming strings and converting
 * empty strings to null. Shared utility to avoid duplicating this logic
 * across contacts.ts, products.ts, and future action files.
 */
export function parseFormData(formData: FormData): Record<string, string | null> {
  const obj: Record<string, string | null> = {};
  formData.forEach((value, key) => {
    const str = value.toString().trim();
    obj[key] = str === '' ? null : str;
  });
  return obj;
}
