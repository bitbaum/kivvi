import { revalidatePath } from 'next/cache';

const TYPE_TO_PATH: Record<string, string> = {
  invoice: '/sales/invoices',
  quote: '/sales/quotes',
  order: '/sales/orders',
  credit_note: '/sales/credit-notes',
  delivery_note: '/sales/delivery-notes',
  dunning: '/sales/dunning',
  purchase_order: '/purchasing/purchase-orders',
  purchase_invoice: '/purchasing/purchase-invoices',
  order_confirmation: '/sales/orders',
};

export function revalidateDocumentPaths(type: string, id?: string) {
  const basePath = TYPE_TO_PATH[type] || '/sales/invoices';
  revalidatePath(basePath);
  if (id) revalidatePath(`${basePath}/${id}`);
  revalidatePath('/dashboard');
}
