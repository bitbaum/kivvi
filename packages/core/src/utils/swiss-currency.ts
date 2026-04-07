import Decimal from "decimal.js";
import { DEFAULT_LOCALE, DEFAULT_CURRENCY } from "../config/locale";

/**
 * Swiss currency utilities.
 * Centralized Swiss-specific financial formatting and rounding.
 */

/**
 * Round CHF amounts to nearest 0.05 (Swiss Rappen rounding).
 *
 * Swiss Franc cash transactions round to the nearest 5 Rappen (0.05 CHF).
 *
 * @example
 * rappenRound(new Decimal('10.12')) // 10.10
 * rappenRound(new Decimal('10.13')) // 10.15
 * rappenRound(new Decimal('10.17')) // 10.15
 * rappenRound(new Decimal('10.18')) // 10.20
 */
export function rappenRound(amount: Decimal): Decimal {
  return amount.times(20).round().div(20);
}

/**
 * Format a decimal amount as Swiss Francs with proper locale formatting.
 * Includes Rappen rounding and Swiss number formatting (apostrophe thousands separator).
 *
 * @example
 * formatSwissFrancs(new Decimal('1234.567')) // "CHF 1'234.55"
 * formatSwissFrancs('1234.567') // "CHF 1'234.55"
 */
export function formatSwissFrancs(amount: string | Decimal): string {
  const decimal = typeof amount === "string" ? new Decimal(amount) : amount;
  const rounded = rappenRound(decimal);

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
  }).format(rounded.toNumber());
}
