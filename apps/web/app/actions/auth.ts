"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@kivvi/database";
import { eq } from "drizzle-orm";
import {
  createOwnedCompany,
  createCompanySchema,
} from "@kivvi/core/src/domain/memberships";
import {
  getInvitationByToken,
  acceptInvitation,
} from "@kivvi/core/src/domain/invitations";
import type { ActionResult } from "./utils";
import { safeErrorMessage } from "./utils";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: createCompanySchema.shape.companyName,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export interface RegisterResult {
  userId: string;
  companyId: string;
  email: string;
  companyName: string;
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Register a new user and company.
 * Creates both company and user atomically in a transaction.
 */
export async function registerAction(
  input: unknown,
): Promise<ActionResult<RegisterResult>> {
  try {
    // Validate input
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Validation failed",
      };
    }

    const { name, email, password, companyName } = parsed.data;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create company, user, and owner membership atomically
    const result = await db.transaction(async (tx) => {
      // Create user first (needed for membership FK)
      const [user] = await tx
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(),
          passwordHash,
        })
        .returning();

      // Create company + owner membership (single source of truth)
      const company = await createOwnedCompany(tx, user.id, companyName);

      // Set user's active company
      await tx
        .update(users)
        .set({ companyId: company.companyId })
        .where(eq(users.id, user.id));

      return {
        userId: user.id,
        companyId: company.companyId,
        email: user.email,
        companyName: company.companyName,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch {
    return {
      success: false,
      error: "Failed to create account",
    };
  }
}

const joinSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Register a new user by accepting an invitation — no company created.
 * The invited company becomes the user's active company.
 * Used by /invite/[token] for unauthenticated visitors.
 */
export async function registerAndAcceptInviteAction(
  inviteToken: string,
  input: unknown,
): Promise<ActionResult<RegisterResult>> {
  try {
    const parsed = joinSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Validation failed",
      };
    }

    const { name, email, password } = parsed.data;

    // Pre-validate invite before creating the user
    const invitation = await getInvitationByToken(db, inviteToken);
    if (!invitation || invitation.status !== "pending") {
      return { success: false, error: "Invitation not found or already used" };
    }
    if (new Date(invitation.expiresAt) < new Date()) {
      return { success: false, error: "This invitation has expired" };
    }
    if (email.toLowerCase() !== invitation.email.toLowerCase()) {
      return {
        success: false,
        error: "Please use the email address this invitation was sent to",
      };
    }

    // Check email not already taken
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    // Create user (no companyId yet)
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(users)
      .values({ name, email: email.toLowerCase(), passwordHash })
      .returning();

    // Accept invite — sets companyId on the user atomically
    const { companyId, companyName } = await acceptInvitation(
      db,
      inviteToken,
      user.id,
    );

    return {
      success: true,
      data: { userId: user.id, companyId, email: user.email, companyName },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to create account"),
    };
  }
}
