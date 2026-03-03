/**
 * Minimal logger for the core package.
 * Does not depend on Sentry — the web app's error boundaries and
 * Server Action catch blocks handle Sentry reporting.
 *
 * These log calls exist in domain functions that intentionally swallow
 * errors (e.g., QR-bill failure continues PDF generation, email failure
 * continues cron processing). The error is logged to stderr so operators
 * can monitor, but execution continues.
 */
export const logger = {
  error(message: string, error?: unknown) {
    if (error !== undefined) {
      console.error(`[core] ${message}`, error);
    } else {
      console.error(`[core] ${message}`);
    }
  },

  warn(message: string, error?: unknown) {
    if (error !== undefined) {
      console.warn(`[core] ${message}`, error);
    } else {
      console.warn(`[core] ${message}`);
    }
  },
};
