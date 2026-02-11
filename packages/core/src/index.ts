// Core utilities and types for Kivvi

export interface KivviConfig {
  companyId: string;
  currency: string;
  locale: string;
  vatRate: number;
}

export const DEFAULT_CONFIG: KivviConfig = {
  companyId: '',
  currency: 'CHF',
  locale: 'de-CH',
  vatRate: 8.1,
};

export function formatCurrency(amount: number, currency = 'CHF'): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: Date, locale = 'de-CH'): string {
  return new Intl.DateTimeFormat(locale).format(date);
}

// Domain modules
export * from './domain/number-sequences';
export * from './domain/contacts';
export * from './domain/products';
export * from './domain/documents';
export * from './domain/dunning';
export * from './domain/accounting';
export * from './domain/accounting-integration';
export * from './domain/banking';
export * from './domain/inventory';
export * from './domain/reports';
export * from './domain/projects';
export * from './domain/onboarding';
export * from './domain/import-mappings';
export * from './domain/import-bulk';
