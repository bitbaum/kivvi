/**
 * Document type and status constants for use in conditionals.
 * Eliminates magic strings like "invoice", "credit_note" scattered in domain logic.
 *
 * Client-safe: no DB or server dependencies.
 */

/** Default payment terms when none specified (30 days is Swiss SME standard) */
export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

/** Document types that can have payments recorded */
export const PAYABLE_DOCUMENT_TYPES = ["invoice", "purchase_invoice"] as const;

/** Document types that generate QR references */
export const QR_REFERENCE_TYPES = ["invoice"] as const;

// ---------------------------------------------------------------------------
// Status sets — use these instead of repeating inline arrays
// ---------------------------------------------------------------------------

/**
 * Statuses where a document has an outstanding receivable/payable balance.
 * Used in financial summaries and overdue detection.
 */
export const OPEN_STATUSES = [
  "sent",
  "confirmed",
  "delivered",
  "partially_paid",
] as const;

/**
 * Statuses where a document is still active but excludes draft.
 * Includes overdue/dunning stages. Used for escalation checks.
 */
export const NON_TERMINAL_STATUSES = [
  "sent",
  "confirmed",
  "delivered",
  "partially_paid",
  "overdue",
  "dunning_1",
  "dunning_2",
  "dunning_3",
] as const;

/**
 * All statuses where a document is not yet closed/cancelled/paid.
 * Includes draft. Used for data-quality checks (e.g. inactive contacts
 * that still have open documents).
 */
export const ACTIVE_STATUSES = ["draft", ...NON_TERMINAL_STATUSES] as const;
