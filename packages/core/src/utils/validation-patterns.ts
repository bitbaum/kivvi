/**
 * Shared Zod regex patterns for financial/ERP validation.
 * Use these instead of duplicating regexes across domain files.
 */

/** Monetary amount with up to 2 decimal places: "0", "1.50", "1234.99" */
export const AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;

/** Quantity with up to 4 decimal places (supports bulk/fractional units) */
export const QUANTITY_REGEX = /^\d+(\.\d{1,4})?$/;

/** Weight/dimension with up to 3 decimal places */
export const WEIGHT_REGEX = /^\d+(\.\d{1,3})?$/;

/** ISO 8601 date prefix: "2026-05-19" */
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;

/** Full ISO 8601 date (exact match, not just prefix) */
export const DATE_EXACT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
