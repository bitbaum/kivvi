import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";

// For local development and Hetzner (production). Neon was decommissioned 2026-06-12.
export function createPostgresClient(connectionString: string) {
  const client = postgres(connectionString, {
    max: parseInt(process.env.DB_POOL_MAX || "10", 10),
    idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || "20", 10),
    connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "10", 10),
    // DB_SSL=disable opts out for self-hosted Postgres on localhost (no TLS).
    ...(process.env.NODE_ENV === "production" &&
      process.env.DB_SSL !== "disable" && { ssl: "require" as const }),
  });
  return drizzle(client, { schema });
}

/** @deprecated Name leftover from Neon. Same TCP client as createPostgresClient. */
export function createNeonClient(connectionString: string) {
  return createPostgresClient(connectionString);
}

export function createDb(connectionString: string) {
  return createPostgresClient(connectionString);
}

export type Database = ReturnType<typeof createPostgresClient>;
