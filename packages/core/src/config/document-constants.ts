/**
 * Document type and status constants for use in conditionals.
 * Eliminates magic strings like "invoice", "credit_note" scattered in domain logic.
 *
 * Client-safe: no DB or server dependencies.
 */

/** Document types that generate journal entries when sent */
export const JOURNAL_ENTRY_ON_SENT_TYPES = ["invoice", "credit_note"] as const;

/** Document types that generate journal entries when confirmed */
export const JOURNAL_ENTRY_ON_CONFIRMED_TYPES = ["purchase_invoice"] as const;

/** Document types that can have payments recorded */
export const PAYABLE_DOCUMENT_TYPES = ["invoice", "purchase_invoice"] as const;

/** Document types that generate QR references */
export const QR_REFERENCE_TYPES = ["invoice"] as const;
