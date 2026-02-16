import { z } from 'zod';
import { auth } from '@/lib/auth';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function getSession() {
  const session = await auth();
  if (!session?.user?.companyId || !session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return { companyId: session.user.companyId, userId: session.user.id };
}

// Known domain errors that are safe to expose to the user
const SAFE_ERROR_PATTERNS = [
  'not found',
  'already exists',
  'Unauthorized',
  'Cannot transition',
  'Cannot convert',
  'Cannot record payment',
  'Cannot create dunning',
  'already reconciled',
  'only draft',
  'Only draft',
  'Only manual',
  'At least',
  'must balance',
  'is already',
  'Unknown sequence',
  'Invalid',
  'required',
];

/**
 * Sanitize error messages for user-facing responses.
 * Exposes known domain errors, replaces everything else with a generic fallback.
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const msg = error.message;
  if (SAFE_ERROR_PATTERNS.some((pattern) => msg.toLowerCase().includes(pattern.toLowerCase()))) {
    return msg;
  }
  console.error('Unexpected error:', error);
  return fallback;
}

/**
 * Format Zod validation errors into field-specific error messages.
 * Returns both a general error message and a map of field errors.
 */
export function formatZodError(error: z.ZodError): { error: string; fieldErrors: Record<string, string[]> } {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[]>;
  const firstError = Object.values(fieldErrors)[0]?.[0];
  return {
    error: firstError || 'Validation failed',
    fieldErrors,
  };
}
