export type PaymentMethod = "cash" | "card" | "twint";

export interface CartItem {
  id: string;
  itemNumber: string;
  description: string;
  askingPrice: string;
  condition: string;
  photoBase64?: string | null;
}

export interface SearchResult {
  id: string;
  itemNumber: string;
  description: string;
  askingPrice: string | null;
  condition: string;
  photoBase64?: string | null;
  status: string;
}
