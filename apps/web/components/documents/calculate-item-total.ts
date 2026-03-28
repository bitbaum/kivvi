import Decimal from "decimal.js";
import { rappenRound } from "@kivvi/core/src/utils/swiss-currency";

interface LineItem {
  quantity: string;
  unitPrice: string;
  discount: string;
}

interface LineItemWithVat extends LineItem {
  vatRate: string;
}

/**
 * Calculate the net total for a document line item.
 * Applies quantity * unitPrice, then subtracts the percentage discount.
 * Rounds to 2 decimal places (Swiss standard: round per line item).
 */
export function calculateItemTotal(item: LineItem): Decimal {
  try {
    const qty = new Decimal(item.quantity || "0");
    const price = new Decimal(item.unitPrice || "0");
    const discount = new Decimal(item.discount || "0");
    const gross = qty.times(price);
    return gross.minus(gross.times(discount).div(100)).toDecimalPlaces(2);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Calculate subtotal, VAT, and Rappen-rounded total for a set of line items.
 * Client-side mirror of core's calculateTotals() for fast UI preview.
 * Server always recalculates before persistence.
 */
export function calculateDocumentTotals(items: LineItemWithVat[]) {
  const subtotal = items.reduce(
    (sum, item) => sum.plus(calculateItemTotal(item)),
    new Decimal(0),
  );
  const vatAmount = items.reduce((sum, item) => {
    const lineTotal = calculateItemTotal(item);
    try {
      const vatRate = new Decimal(item.vatRate || "0");
      return sum.plus(lineTotal.times(vatRate).div(100).toDecimalPlaces(2));
    } catch {
      return sum;
    }
  }, new Decimal(0));
  const total = rappenRound(subtotal.plus(vatAmount));
  return { subtotal, vatAmount, total };
}
