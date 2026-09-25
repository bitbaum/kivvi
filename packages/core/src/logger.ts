/**
 * Minimal logger for the core package.
 * Error boundaries and Server Action catch blocks in the web app log through
 * apps/web/lib/logger, which writes to the console.
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
