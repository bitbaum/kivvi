import type { Database } from '@kivvi/database';
import type { ExecutionContext } from '../types';

/**
 * Get the typed database instance from the execution context.
 * Centralizes the cast from `unknown` to `Database` in one place,
 * avoiding `as any` in every tool file.
 */
export function getDb(context: ExecutionContext): Database {
  return context.db as Database;
}
