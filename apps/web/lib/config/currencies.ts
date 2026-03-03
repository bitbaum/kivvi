/**
 * Supported currencies (SSOT).
 * Add new currencies here when expanding beyond Swiss market.
 */
export const SUPPORTED_CURRENCIES = ['CHF', 'EUR', 'USD'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
