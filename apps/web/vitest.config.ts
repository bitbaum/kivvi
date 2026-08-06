import { defineConfig } from "vitest/config";
import path from "path";

/**
 * apps/web had no unit test runner — only Playwright e2e, which needs a built
 * app and a database. That left pure logic in lib/ with nowhere cheap to be
 * tested, so it wasn't. Mirrors the vitest config each package already carries,
 * aliases included, so a test here resolves workspace imports as the app does.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: [
      {
        find: /^@kivvi\/database\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/database/$1"),
      },
      {
        find: "@kivvi/database",
        replacement: path.resolve(__dirname, "../../packages/database/src"),
      },
      {
        find: /^@kivvi\/core\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/core/$1"),
      },
      {
        find: "@kivvi/core",
        replacement: path.resolve(__dirname, "../../packages/core/src"),
      },
      { find: "@", replacement: path.resolve(__dirname) },
    ],
  },
});
