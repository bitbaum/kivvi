import type { DocumentType } from '@kivvi/database';

/**
 * SSOT for valid document conversion paths.
 * Pure constant — no DB imports. Safe for import in both domain logic and UI config.
 *
 * Imported by:
 * - packages/core/src/domain/documents.ts (convertDocument validation)
 * - apps/web/lib/config/document-types.ts (UI conversion buttons)
 */
export const VALID_CONVERSIONS: Partial<Record<DocumentType, DocumentType[]>> = {
  quote: ['order', 'invoice'],
  order: ['order_confirmation', 'delivery_note', 'invoice'],
  order_confirmation: ['delivery_note', 'invoice'],
  delivery_note: ['invoice'],
  invoice: ['credit_note'],
  purchase_order: ['purchase_invoice'],
};
