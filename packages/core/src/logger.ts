/**
 * THE logger for the monorepo — domain code, the AI package and the web app
 * all import this one. It writes to the console and, when a reporter has been
 * wired, forwards errors to it.
 *
 * Reporting is injected rather than imported so this file stays free of
 * framework dependencies: `packages/core` runs in cron scripts and tests as
 * well as inside Next. The web app wires Sentry in `apps/web/lib/logger.ts`,
 * which is the only place that knows Sentry exists.
 *
 * Many of these calls sit in domain functions that intentionally swallow an
 * error (a QR-bill failure still produces a PDF, an email failure still
 * finishes the cron run). The error is logged so operators can see it, and
 * execution continues.
 */

export interface LogReporter {
  captureException(error: Error, context?: Record<string, unknown>): void;
  captureMessage(message: string, context?: Record<string, unknown>): void;
}

let reporter: LogReporter | null = null;

/** Wire an error reporter. Called once, at module load, by the host app. */
export function setLogReporter(next: LogReporter | null): void {
  reporter = next;
}

export const logger = {
  /**
   * An unexpected failure. Console + reporter (Sentry, in the web app).
   * Use for: server errors, API failures, payment issues, cron failures.
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    console.error(`[error] ${message}`, error || "");
    if (!reporter) return;
    if (error instanceof Error) {
      reporter.captureException(error, { message, ...context });
    } else if (error !== undefined) {
      reporter.captureMessage(message, { error, ...context });
    } else {
      reporter.captureMessage(message, context);
    }
  },

  /**
   * An expected edge case. Console only, never reported.
   * Use for: parse failures, localStorage issues, non-critical client errors.
   */
  warn(message: string, error?: unknown) {
    if (error !== undefined) {
      console.warn(`[warn] ${message}`, error);
    } else {
      console.warn(`[warn] ${message}`);
    }
  },

  /** Debug output. Development only. */
  info(message: string, ...args: unknown[]) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console -- this file IS the console boundary
      console.info(`[info] ${message}`, ...args);
    }
  },
};
