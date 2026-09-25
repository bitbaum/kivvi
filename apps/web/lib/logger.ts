/**
 * Structured logger. Errors go to the console, which is the server journal
 * in production and the browser console on the client.
 *
 * - error(): console.error (unexpected failures)
 * - warn():  console.warn only (expected edge cases, client-side issues)
 * - info():  console.info in development only (debug output)
 */
export const logger = {
  /**
   * Log an unexpected error.
   * Use for: server errors, API failures, payment issues, cron failures.
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    // context used to go ONLY to Sentry, which had no DSN, so it was discarded.
    // It belongs in the same line as the error it explains.
    console.error(`[error] ${message}`, error ?? "", ...(context ? [context] : []));
  },

  /**
   * Log a warning.
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
    if (process.env.NODE_ENV !== "production") {
      console.info(`[info] ${message}`, ...args);
    }
  },
};
