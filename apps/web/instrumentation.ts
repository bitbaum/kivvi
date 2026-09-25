/**
 * Next.js instrumentation hook.
 * Runs once when the server starts.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Validate environment variables in production
  if (process.env.NODE_ENV === "production") {
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }
}
