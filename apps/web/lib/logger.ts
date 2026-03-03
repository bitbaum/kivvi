import * as Sentry from '@sentry/nextjs';

/**
 * Structured logger with Sentry integration.
 *
 * - error(): console.error + Sentry.captureException (unexpected failures)
 * - warn():  console.warn only (expected edge cases, client-side issues)
 * - info():  console.info in development only (debug output)
 */
export const logger = {
  /**
   * Log an unexpected error. Reports to Sentry in production.
   * Use for: server errors, API failures, payment issues, cron failures.
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    console.error(`[error] ${message}`, error || '');
    if (error instanceof Error) {
      Sentry.captureException(error, { extra: { message, ...context } });
    } else if (error !== undefined) {
      Sentry.captureMessage(message, { level: 'error', extra: { error, ...context } });
    } else {
      Sentry.captureMessage(message, { level: 'error', extra: context });
    }
  },

  /**
   * Log a warning. Console only, no Sentry.
   * Use for: parse failures, localStorage issues, non-critical client errors.
   */
  warn(message: string, error?: unknown) {
    if (error !== undefined) {
      console.warn(`[warn] ${message}`, error);
    } else {
      console.warn(`[warn] ${message}`);
    }
  },

  /**
   * Log info. Development only.
   */
  info(message: string, ...args: unknown[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[info] ${message}`, ...args);
    }
  },
};
