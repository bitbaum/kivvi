import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import type { MembershipRole } from "@kivvi/database";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Role hierarchy: owner > admin > member > viewer */
const ROLE_LEVEL: Record<MembershipRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export async function getSession() {
  const session = await auth();
  if (!session?.user?.companyId || !session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return {
    companyId: session.user.companyId,
    userId: session.user.id,
    role: (session.user.role || "member") as MembershipRole,
  };
}

/**
 * Get session and verify the user has at least the required role.
 * Throws 'Unauthorized' if insufficient permissions.
 *
 * Role hierarchy: owner > admin > member > viewer
 * - viewer: read-only access
 * - member: standard CRUD operations
 * - admin: settings, sequences, fiscal years, team management
 * - owner: billing, company deletion, ownership transfer
 */
export async function requireRole(minRole: MembershipRole) {
  const session = await getSession();
  if (ROLE_LEVEL[session.role] < ROLE_LEVEL[minRole]) {
    throw new Error("Unauthorized: insufficient permissions");
  }
  return session;
}

// Known domain errors that are safe to expose to the user
const SAFE_ERROR_PATTERNS = [
  "not found",
  "already exists",
  "Unauthorized",
  "Cannot transition",
  "Cannot convert",
  "Cannot record payment",
  "Cannot create dunning",
  "already reconciled",
  "only draft",
  "Only draft",
  "Only manual",
  "At least",
  "must balance",
  "is already",
  "Unknown sequence",
  "Invalid",
  "required",
  "IBAN mismatch",
];

/**
 * Sanitize error messages for user-facing responses.
 * Exposes known domain errors, replaces everything else with a generic fallback.
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const msg = error.message;
  if (
    SAFE_ERROR_PATTERNS.some((pattern) =>
      msg.toLowerCase().includes(pattern.toLowerCase()),
    )
  ) {
    return msg;
  }
  Sentry.captureException(error);
  return fallback;
}

/**
 * Format Zod validation errors into field-specific error messages.
 * Returns both a general error message and a map of field errors.
 */
export function formatZodError(error: z.ZodError): {
  error: string;
  fieldErrors: Record<string, string[]>;
} {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[]>;
  const firstError = Object.values(fieldErrors)[0]?.[0];
  return {
    error: firstError || "Validation failed",
    fieldErrors,
  };
}
