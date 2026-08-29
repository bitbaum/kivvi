/**
 * Swiss VAT rate configuration (SSOT).
 * These rates are defined by Swiss federal tax law.
 *
 * Current rates (as of 2024):
 * - 8.1% Standard rate (most goods and services)
 * - 2.6% Reduced rate (food, medicine, books, etc.)
 * - 0.0% Exempt (exports, financial services, etc.)
 */

export const SWISS_VAT_RATES = [
  { value: "8.1", labelKey: "standard" },
  { value: "2.6", labelKey: "reduced" },
  { value: "0.0", labelKey: "exempt" },
] as const;

/**
 * Default VAT rate used when creating new line items.
 * Set to the standard Swiss VAT rate.
 */
export const DEFAULT_VAT_RATE = "8.1";

/**
 * Human-readable labels for VAT rates (German).
 */
export const VAT_RATE_LABELS: Record<string, string> = {
  "8.1": "8.1% (Normal)",
  "2.6": "2.6% (Reduziert)",
  "0.0": "0% (Befreit)",
  "0": "0% (Befreit)", // Allow both '0' and '0.0'
};
