import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import type { MembershipRole } from "@kivvi/database";

type Database = typeof db;

interface ActionContext {
  companyId: string;
  userId: string;
  db: Database;
}

/**
 * Factory for creating server actions with standard boilerplate:
 * - Authentication (getSession) or RBAC (requireRole)
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
  minRole?: MembershipRole;
}): (input: TInput) => Promise<ActionResult<TResult>> {
  return async (input: TInput): Promise<ActionResult<TResult>> => {
    try {
      const { companyId, userId } = opts.minRole
        ? await requireRole(opts.minRole)
        : await getSession();
      const result = await opts.handler(input, { companyId, userId, db });

      if (opts.revalidate) {
        for (const path of opts.revalidate) {
          revalidatePath(path);
        }
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: safeErrorMessage(error, opts.errorMessage),
      };
    }
  };
}
