import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['de-CH', 'en', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'de-CH';

function getLocaleFromHeaders(): Locale {
  const acceptLanguage = headers().get('Accept-Language') || '';
  // Check for French first (fr-CH, fr-FR, fr)
  if (/\bfr\b/i.test(acceptLanguage)) return 'fr';
  // Check for English (en-GB, en-US, en)
  if (/\ben\b/i.test(acceptLanguage)) return 'en';
  // Default to Swiss German
  return 'de-CH';
}

export default getRequestConfig(async () => {
  // Priority: 1. Cookie  2. Accept-Language header  3. Default (de-CH)
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value;
  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale as Locale)
      ? (cookieLocale as Locale)
      : getLocaleFromHeaders();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
