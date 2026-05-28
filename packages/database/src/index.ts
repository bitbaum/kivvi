import { drizzle } from "drizzle-orm/postgres-js";
import { drizzle as drizzleNeonWs } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import postgres from "postgres";
import ws from "ws";
import * as schema from "./schema";

export * from "./schema";

// WebSocket constructor for Neon serverless driver.
// Required in Node.js environments (Vercel functions) where a global `WebSocket`
// is not available. The `ws` package is already a transitive dependency of
// `@neondatabase/serverless`, so no extra install is needed.
neonConfig.webSocketConstructor = ws;

// Route single Pool queries through HTTPS fetch instead of WebSocket.
// Next.js's webpack bundle of `ws` was breaking with "t.mask is not a
// function" inside the WebSocket frame masker, which made every auth query
// — and therefore every login — fail in production with a generic NextAuth
// `Configuration` error. Single queries don't need a stateful connection;
// explicit `db.transaction()` blocks still upgrade to WebSocket because
// Postgres transactions require it.
neonConfig.poolQueryViaFetch = true;

/**
 * Neon serverless driver using WebSocket connections.
 *
 * Replaces the previous neon-http driver. Key difference:
 *   - neon-http: no native transaction support (HTTP is stateless)
 *   - neon-serverless (WebSocket): full ACID transactions via `db.transaction()`
 *
 * Use this on Vercel/serverless and when explicitly requested via USE_NEON.
 *
 * The cast to `ReturnType<typeof createPostgresClient>` is safe because the
 * query interfaces are structurally identical (both implement the same Drizzle
 * query builder API). Using a union type breaks TypeScript's ability to infer
 * `.returning()` overloads, so we normalize to one canonical type.
 */
export function createNeonClient(connectionString: string) {
  const pool = new Pool({ connectionString });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return drizzleNeonWs(pool, { schema }) as any as ReturnType<
    typeof createPostgresClient
  >;
}

// For local development / traditional hosting
export function createPostgresClient(connectionString: string) {
  const client = postgres(connectionString, {
    max: parseInt(process.env.DB_POOL_MAX || "10", 10),
    idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || "20", 10),
    connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "10", 10),
    ...(process.env.NODE_ENV === "production" && { ssl: "require" as const }),
  });
  return drizzle(client, { schema });
}

// Default export based on environment
export function createDb(connectionString: string) {
  // On Vercel (VERCEL=1 set automatically) or when USE_NEON=true, use the
  // Neon WebSocket driver which supports native db.transaction() calls.
  // For self-hosted / local Postgres, postgres-js with connection pooling is used.
  if (process.env.VERCEL || process.env.USE_NEON === "true") {
    return createNeonClient(connectionString);
  }
  return createPostgresClient(connectionString);
}

export type Database = ReturnType<typeof createPostgresClient>;
