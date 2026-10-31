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

  // Seal company AI keys still stored in plaintext. The box holds only the
  // standalone build, so this is where it runs. Not awaited: start-up never
  // waits on it, and it catches and logs its own failure (counts only).
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.DATABASE_URL
  ) {
    void Promise.all([import("./lib/db"), import("./lib/seal-company-ai-keys")])
      .then(([{ db }, { sealCompanyAiKeysOnStart }]) => sealCompanyAiKeysOnStart(db))
      .catch((error: unknown) => {
        console.error(
          `[seal-company-ai-keys] skipped at start-up: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      });
  }
}
