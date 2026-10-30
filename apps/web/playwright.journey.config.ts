import { defineConfig, devices } from "@playwright/test";

/**
 * The account journey (e2e/account-journey.spec.ts) against a server that is
 * already running: CI starts the production build (`next start`) on a
 * Postgres built from the committed migrations. BASE_URL picks the server.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "account-journey.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    // Accept-Language decides the UI language; the spec reads English labels.
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
