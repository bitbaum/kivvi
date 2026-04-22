/**
 * Client-side re-export of the shared document totals utility.
 * Kept as a shim so existing imports continue to work without changes.
 */
import Decimal from "decimal.js";
import {
  calcItemNet,
  calcDocumentTotals,
  type LineItemInput,
} from "@kivvi/core/src/utils/document-totals";

interface LineItem {
  quantity: string;
  unitPrice: string;
  discount: string;
}

interface LineItemWithVat extends LineItem {
  vatRate: string;
}

export function calculateItemTotal(item: LineItem): Decimal {
  return calcItemNet(item);
}

export function calculateDocumentTotals(items: LineItemWithVat[]) {
  return calcDocumentTotals(items as LineItemInput[]);
}
