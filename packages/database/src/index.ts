import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';

// For serverless (Vercel, Neon)
export function createNeonClient(connectionString: string) {
  const sql = neon(connectionString);
  return drizzleNeon(sql, { schema });
}

// For local development / traditional hosting
export function createPostgresClient(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

// Default export based on environment
export function createDb(connectionString: string) {
  // Use Neon driver for serverless environments
  if (process.env.VERCEL || process.env.USE_NEON === 'true') {
    return createNeonClient(connectionString);
  }
  return createPostgresClient(connectionString);
}

export type Database = ReturnType<typeof createPostgresClient>;
