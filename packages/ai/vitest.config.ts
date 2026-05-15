import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: [
      {
        find: /^@kivvi\/database\/(.*)$/,
        replacement: path.resolve(__dirname, "../database/$1"),
      },
      {
        find: "@kivvi/database",
        replacement: path.resolve(__dirname, "../database/src"),
      },
      {
        find: /^@kivvi\/core\/(.*)$/,
        replacement: path.resolve(__dirname, "../core/$1"),
      },
      {
        find: "@kivvi/core",
        replacement: path.resolve(__dirname, "../core/src"),
      },
    ],
  },
});
