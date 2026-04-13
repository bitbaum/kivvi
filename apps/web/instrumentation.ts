/**
 * Next.js instrumentation hook.
 * Runs once when the server starts (replaces sentry.server.config.ts and sentry.edge.config.ts).
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Validate environment variables in production
  if (process.env.NODE_ENV === "production") {
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }

  // Initialize Sentry for server and edge runtimes
  if (process.env.SENTRY_DSN) {
    const sentryConfig = {
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === "production",
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      environment: process.env.NODE_ENV,
      // Strip personal data from breadcrumbs
      beforeBreadcrumb: (breadcrumb: { category?: string }) => {
        if (breadcrumb.category === "console") return null;
        return breadcrumb;
      },
    };

    if (process.env.NEXT_RUNTIME === "nodejs") {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init(sentryConfig);
    }

    if (process.env.NEXT_RUNTIME === "edge") {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init(sentryConfig);
    }
  }
}
