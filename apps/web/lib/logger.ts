import * as Sentry from "@sentry/nextjs";
import { logger, setLogReporter } from "@kivvi/core/src/logger";

/**
 * The web app's binding of the one logger (`@kivvi/core/src/logger`) to Sentry.
 *
 * Importing `logger` from here is what wires reporting, so app code keeps
 * importing `@/lib/logger` — it runs in both the server and the client bundle,
 * which is why the wiring lives in a module rather than in instrumentation.
 */
setLogReporter({
  captureException: (error, context) => {
    Sentry.captureException(error, { extra: context });
  },
  captureMessage: (message, context) => {
    Sentry.captureMessage(message, { level: "error", extra: context });
  },
});

export { logger };
