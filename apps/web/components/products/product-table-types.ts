export interface ProductItem {
  id: string;
  articleNumber: string | null;
  name: string;
  sku: string | null;
  type: string;
  unitPrice: string;
  currency: string | null;
  unit: string | null;
  vatRate: string | null;
  stockQuantity: string | null;
  minStock: number | null;
  isActive: boolean | null;
}

export interface ProductTableTranslations {
  columnLabels: {
    articleNumber: string;
    name: string;
    type: string;
    unitPrice: string;
    vatRate: string;
    stock: string;
    status: string;
    active: string;
    inactive: string;
    sku: string;
    outOfStock: string;
    lowStock: string;
  };
  typeLabels: Record<string, string>;
  bulkLabels: Record<string, string>;
}
