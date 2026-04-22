/**
 * Document financial calculations — pure utility, zero DB deps.
 * Safe to import in both client components and server-side domain functions.
 *
 * Single source of truth for line item and document total math.
 * Both the client-side preview (calculate-item-total.ts) and the server-side
 * persistence path (documents.ts calculateTotals) derive from here.
 */
import Decimal from "decimal.js";
import { rappenRound } from "./swiss-currency";

export interface LineItemInput {
  quantity: string;
  unitPrice: string;
  discount: string;
  vatRate: string;
}

export interface DocumentTotals {
  subtotal: Decimal;
  vatAmount: Decimal;
  total: Decimal;
}

/**
 * Calculate the net total for a single line item.
 * quantity × unitPrice − discount%. Rounds to 2dp (Swiss: round per line).
 */
export function calcItemNet(
  item: Pick<LineItemInput, "quantity" | "unitPrice" | "discount">,
): Decimal {
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
 * Calculate subtotal, VAT, and Rappen-rounded grand total for a document.
 * VAT is rounded per line item (Swiss standard).
 */
export function calcDocumentTotals(items: LineItemInput[]): DocumentTotals {
  let subtotal = new Decimal(0);
  let vatAmount = new Decimal(0);

  for (const item of items) {
    const lineNet = calcItemNet(item);
    let lineVat = new Decimal(0);
    try {
      const vatRate = new Decimal(item.vatRate || "0");
      lineVat = lineNet.times(vatRate).div(100).toDecimalPlaces(2);
    } catch {
      // malformed vatRate — treat as 0
    }
    subtotal = subtotal.plus(lineNet);
    vatAmount = vatAmount.plus(lineVat);
  }

  const total = rappenRound(subtotal.plus(vatAmount));
  return { subtotal, vatAmount, total };
}
