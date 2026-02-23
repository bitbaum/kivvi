import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'CHF'): string {
  const formatter = new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
  });

  // Intl.NumberFormat de-CH omits the space before the minus sign for negative
  // amounts (e.g. "CHF-0.03"). Reconstruct from parts to ensure consistent
  // spacing: "CHF -0.03".
  if (amount < 0) {
    const parts = formatter.formatToParts(amount);
    let result = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Insert a space between the currency symbol and the minus sign
      if (part.type === 'minusSign' && i > 0 && parts[i - 1].type === 'currency') {
        result += ' ';
      }
      result += part.value;
    }
    return result;
  }

  return formatter.format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('de-CH').format(d);
}
