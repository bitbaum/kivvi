'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { type ActionResult, getSession, safeErrorMessage } from './utils';

type Database = typeof db;

interface ActionContext {
  companyId: string;
  userId: string;
  db: Database;
}

/**
 * Factory for creating server actions with standard boilerplate:
 * - Authentication (getSession)
 * - Error handling (safeErrorMessage)
 * - Path revalidation
 *
 * Eliminates the repeated try/catch/getSession/revalidate pattern
 * across 15+ server action files.
 */
export function createAction<TInput, TResult>(opts: {
  handler: (input: TInput, ctx: ActionContext) => Promise<TResult>;
  revalidate?: string[];
  errorMessage: string;
}): (input: TInput) => Promise<ActionResult<TResult>> {
  return async (input: TInput): Promise<ActionResult<TResult>> => {
    try {
      const { companyId, userId } = await getSession();
      const result = await opts.handler(input, { companyId, userId, db });

      if (opts.revalidate) {
        for (const path of opts.revalidate) {
          revalidatePath(path);
        }
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: safeErrorMessage(error, opts.errorMessage) };
    }
  };
}
