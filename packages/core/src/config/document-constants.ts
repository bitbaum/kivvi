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

/**
 * Document types present in kivitendo CSV exports.
 * Used by import-bulk to sync number sequences after data import.
 * Excludes dunning, order_confirmation, and intake — not in kivitendo exports.
 */
export const IMPORTABLE_DOCUMENT_TYPES = [
  "invoice",
  "quote",
  "order",
  "delivery_note",
  "purchase_invoice",
  "purchase_order",
  "credit_note",
] as const;

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

/**
 * Statuses for documents that have been formally issued (sent to counterparty)
 * and not cancelled. Includes paid. Used for financial reports that need
 * all posted transactions (VAT report, P&L, aging report).
 */
export const ISSUED_STATUSES = [...NON_TERMINAL_STATUSES, "paid"] as const;

/**
 * Statuses from which no further workflow action is possible.
 * Used in UI to hide action buttons and editing controls.
 */
export const TERMINAL_DOCUMENT_STATUSES = ["paid", "cancelled"] as const;

/**
 * Statuses where an invoice can be overdue (open balance, past due date).
 * Alias of OPEN_STATUSES — use this name in nav badges and overdue counts.
 */
export const OVERDUE_ELIGIBLE_STATUSES = OPEN_STATUSES;

/**
 * Statuses that may display as overdue when past the due date.
 * Includes dunning stages (still collectible).
 */
export const OVERDUE_CANDIDATE_STATUSES = [
  ...OPEN_STATUSES,
  "overdue",
  "dunning_1",
  "dunning_2",
  "dunning_3",
] as const;

// ---------------------------------------------------------------------------
// Document status transitions — SSOT for domain + UI validation
// ---------------------------------------------------------------------------

/**
 * Valid document status transitions. Domain enforces these; UI actions must
 * be a subset (each action.targetStatus must be in this list for from-status).
 */
export const VALID_DOCUMENT_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "confirmed", "cancelled"],
  sent: ["confirmed", "paid", "partially_paid", "overdue", "cancelled"],
  confirmed: ["delivered", "paid", "partially_paid", "overdue", "cancelled"],
  delivered: ["paid", "partially_paid", "overdue", "cancelled"],
  partially_paid: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "partially_paid", "dunning_1", "cancelled"],
  dunning_1: ["paid", "partially_paid", "dunning_2", "cancelled"],
  dunning_2: ["paid", "partially_paid", "dunning_3", "cancelled"],
  dunning_3: ["paid", "partially_paid", "cancelled"],
  paid: [],
  cancelled: [],
};

/** Whether a document status transition is allowed by business rules. */
export function isValidDocumentTransition(from: string, to: string): boolean {
  return VALID_DOCUMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
