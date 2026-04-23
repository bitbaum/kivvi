import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";

export interface LineItem {
  id: string;
  productId: string | null;
  inventoryItemId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  vatRate: string;
  stockQuantity: string | null;
}

export function emptyItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    productId: null,
    inventoryItemId: null,
    description: "",
    quantity: "1",
    unitPrice: "0.00",
    discount: "0",
    vatRate: DEFAULT_VAT_RATE,
    stockQuantity: null,
  };
}
