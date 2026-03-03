import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';

// Use node-fetch instead of Node.js built-in fetch (undici) for Neon HTTP driver.
// Node's undici has connection issues in some network environments (ETIMEDOUT on port 443).
import nodeFetch from 'node-fetch';
neonConfig.fetchFunction = nodeFetch as any;

// For serverless (Vercel, Neon)
export function createNeonClient(connectionString: string) {
  const sql = neon(connectionString, { fetchOptions: { cache: 'no-store' } });
  return drizzleNeon(sql, { schema });
}

// For local development / traditional hosting
export function createPostgresClient(connectionString: string) {
  const client = postgres(connectionString, {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '20', 10),
    connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10', 10),
    ...(process.env.NODE_ENV === 'production' && { ssl: 'require' as const }),
  });
  return drizzle(client, { schema });
}

// Default export based on environment
export function createDb(connectionString: string) {
  // Neon HTTP driver is only needed in actual serverless/edge environments
  // where persistent TCP connections aren't possible. For local dev
  // and traditional hosting, postgres-js with connection pooling is
  // more reliable (avoids HTTP rate limits from concurrent queries).
  if (process.env.VERCEL) {
    return createNeonClient(connectionString);
  }
  return createPostgresClient(connectionString);
}

export type Database = ReturnType<typeof createPostgresClient>;
