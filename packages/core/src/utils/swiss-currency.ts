import Decimal from "decimal.js";

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
