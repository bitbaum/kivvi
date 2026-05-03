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
  type WelcomeEmailStrings,
} from "@kivvi/core/src/domain/email";
import { escapeHtml } from "@kivvi/core/src/utils/html";
import type { ActionResult } from "./utils";
import { safeErrorMessage } from "./utils";
import { getTranslations } from "next-intl/server";
import { getTransporter, getFromEmail } from "@/lib/email/transporter";
import { isEmailConfigured } from "@/lib/config/email";
import { logger } from "@/lib/logger";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  companyName?: string;
};

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
  const t = await getTranslations("auth");
  try {
    const registerSchema = z.object({
      name: z.string().min(2, t("nameMinLength")),
      email: z.string().email(t("emailInvalid")),
      password: z.string().min(8, t("passwordMinLength")),
      companyName: createCompanySchema.shape.companyName.optional(),
    });
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
        error: t("errorEmailAlreadyExists"),
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
        const tAuth = await getTranslations("auth");
        const welcomeStrings: WelcomeEmailStrings = {
          subject: tAuth("welcomeSubject", { name }),
          greeting: `${tAuth("welcomeGreeting")} ${escapeHtml(name)}!`,
          body1Html: tAuth("welcomeBody1", {
            company: `<strong>${escapeHtml(result.companyName)}</strong>`,
          }),
          body2: tAuth("welcomeBody2"),
          buttonText: tAuth("welcomeButton"),
          featuresHeading: tAuth("welcomeFeaturesHeading"),
          feature1: tAuth("welcomeFeature1"),
          feature2: tAuth("welcomeFeature2"),
          feature3: tAuth("welcomeFeature3"),
          feature4: tAuth("welcomeFeature4"),
          footerAuto: tAuth("welcomeFooterAuto"),
        };
        await transporter.sendMail({
          from: getFromEmail(),
          to: result.email,
          subject: buildWelcomeEmailSubject(emailData, welcomeStrings),
          html: buildWelcomeEmailHtml(emailData, welcomeStrings),
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
      error: t("errorCreateAccount"),
    };
  }
}

/**
 * Register a new user by accepting an invitation — no company created.
 * The invited company becomes the user's active company.
 * Used by /invite/[token] for unauthenticated visitors.
 */
export async function registerAndAcceptInviteAction(
  inviteToken: string,
  input: unknown,
): Promise<ActionResult<RegisterResult>> {
  const t = await getTranslations("auth");
  try {
    const joinSchema = z.object({
      name: z.string().min(2, t("nameMinLength")),
      email: z.string().email(t("emailInvalid")),
      password: z.string().min(8, t("passwordMinLength")),
    });
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
      return { success: false, error: t("errorInvitationNotFound") };
    }
    if (new Date(invitation.expiresAt) < new Date()) {
      return { success: false, error: t("errorInvitationExpired") };
    }
    if (email.toLowerCase() !== invitation.email.toLowerCase()) {
      return { success: false, error: t("errorInvitationEmailMismatch") };
    }

    // Check email not already taken
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    if (existingUser) {
      return { success: false, error: t("errorEmailAlreadyExists") };
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
      error: safeErrorMessage(error, t("errorCreateAccount")),
    };
  }
}
