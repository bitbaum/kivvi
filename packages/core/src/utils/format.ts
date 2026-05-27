import { DEFAULT_LOCALE, DEFAULT_CURRENCY } from "../config/locale";

/**
 * Format a numeric amount as a currency string in the default locale.
 *
 * Intl.NumberFormat de-CH omits the space between the currency symbol and
 * the minus sign for negatives ("CHF-0.03"). This formatter inserts that
 * space so all displays read consistently ("CHF -0.03").
 */
export function formatCurrency(
  amount: number | string,
  currency: string = DEFAULT_CURRENCY,
): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
  });

  if (num < 0) {
    const parts = formatter.formatToParts(num);
    let result = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (
        part.type === "minusSign" &&
        i > 0 &&
        parts[i - 1].type === "currency"
      ) {
        result += " ";
      }
      result += part.value;
    }
    return result;
  }

  return formatter.format(num);
}

/**
 * Format a Date or ISO string in the default locale (DD.MM.YYYY for de-CH).
 * Returns an empty string for null/undefined and the original input for
 * unparseable strings so callers don't need to special-case missing data.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (date === null || date === undefined) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return typeof date === "string" ? date : "";
  return new Intl.DateTimeFormat(DEFAULT_LOCALE).format(d);
}
