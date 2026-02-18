import type { Locale } from '@/i18n/request';

/** Locale configuration — native names never change with locale */
export const LOCALE_CONFIG: Record<Locale, { short: string; native: string }> = {
  'de-CH': { short: 'DE', native: 'Deutsch' },
  en: { short: 'EN', native: 'English' },
  fr: { short: 'FR', native: 'Français' },
};

/** Language options for contact forms (correspondence language) */
export const LANGUAGE_OPTIONS = [
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
] as const;

/** Country options for address forms (Swiss-centric) */
export const COUNTRY_OPTIONS = [
  { value: 'CH', label: 'Switzerland' },
  { value: 'DE', label: 'Germany' },
  { value: 'AT', label: 'Austria' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'LI', label: 'Liechtenstein' },
] as const;
