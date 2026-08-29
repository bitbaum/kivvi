import type { Locale } from "@/i18n/request";

/** Locale configuration — native names never change with locale */
export const LOCALE_CONFIG: Record<Locale, { short: string; native: string }> = {
  "de-CH": { short: "DE", native: "Deutsch" },
  en: { short: "EN", native: "English" },
  fr: { short: "FR", native: "Français" },
};

/** Language options for contact forms (correspondence language) */
export const LANGUAGE_OPTIONS = [
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
] as const;

/** Country option values for address forms (Swiss-centric). Labels resolved via i18n common.countries.* */
export const COUNTRY_OPTIONS = ["CH", "DE", "AT", "FR", "IT", "LI"] as const;
