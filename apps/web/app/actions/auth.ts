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
import {
  buildWelcomeEmailSubject,
  buildWelcomeEmailHtml,
} from "@kivvi/core/src/domain/email";
import type { ActionResult } from "./utils";
import { safeErrorMessage } from "./utils";
import { getTransporter, getFromEmail } from "@/lib/email/transporter";
import { isEmailConfigured } from "@/lib/config/email";
import { logger } from "@/lib/logger";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Optional: omit when registering to join an existing organisation
  companyName: createCompanySchema.shape.companyName.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export interface RegisterResult {
  userId: string;
  companyId: string | null;
  email: string;
  companyName: string | null;
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

    // Create user; optionally create company when registering as an owner
    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(),
          passwordHash,
        })
        .returning();

      if (companyName) {
        // Owner path: create company + owner membership atomically
        const company = await createOwnedCompany(tx, user.id, companyName);
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
      }

      // Member path: no company yet — user will join via invite link
      return {
        userId: user.id,
        companyId: null,
        email: user.email,
        companyName: null,
      };
    });

    // Send welcome email — best-effort, never block registration
    if (isEmailConfigured() && result.companyName) {
      try {
        const transporter = getTransporter();
        const loginUrl = process.env.NEXTAUTH_URL
          ? `${process.env.NEXTAUTH_URL}/login`
          : "https://kivvi.ch/login";
        const emailData = {
          userName: name,
          userEmail: result.email,
          companyName: result.companyName,
          loginUrl,
        };
        await transporter.sendMail({
          from: getFromEmail(),
          to: result.email,
          subject: buildWelcomeEmailSubject(emailData),
          html: buildWelcomeEmailHtml(emailData),
        });
      } catch (emailError) {
        logger.error("Failed to send welcome email", emailError);
        // Do not fail registration because of email error
      }
    }

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
