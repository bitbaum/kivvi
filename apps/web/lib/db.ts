import { createDb, type Database } from '@kivvi/database';

function getDb(): Database {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return createDb(process.env.DATABASE_URL) as unknown as Database;
}

// Lazy singleton — only connects when first accessed at runtime
let _db: Database | null = null;
export const db = new Proxy({} as Database, {
  get(_, prop) {
    if (!_db) _db = getDb();
    // Justified: Proxy handler requires dynamic property access
    return (_db as any)[prop];
  },
});
