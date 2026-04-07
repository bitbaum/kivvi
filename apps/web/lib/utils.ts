import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DEFAULT_LOCALE,
  DEFAULT_CURRENCY,
} from "@kivvi/core/src/config/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string,
  currency: string = DEFAULT_CURRENCY,
): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
  });

  // Intl.NumberFormat de-CH omits the space before the minus sign for negative
  // amounts (e.g. "CHF-0.03"). Reconstruct from parts to ensure consistent
  // spacing: "CHF -0.03".
  if (num < 0) {
    const parts = formatter.formatToParts(num);
    let result = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Insert a space between the currency symbol and the minus sign
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(DEFAULT_LOCALE).format(d);
}
