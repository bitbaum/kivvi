"use server";

import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@kivvi/database";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { ActionResult } from "./utils";
import { sendPasswordResetEmail } from "./email";
import { getTranslations } from "next-intl/server";
import type { PasswordResetEmailStrings } from "@kivvi/core/src/domain/email";

const requestResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Request a password reset email.
 * Generates a secure token and sends email with reset link.
 */
export async function requestPasswordResetAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = requestResetSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Invalid email",
      };
    }

    const { email } = parsed.data;

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return {
        success: true,
        data: { message: "If that email exists, a reset link has been sent" },
      };
    }

    // Delete any existing reset tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    // Generate secure random token
    const token = randomBytes(32).toString("hex");

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to database
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send password reset email
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
    try {
      const tAuth = await getTranslations("auth");
      const resetStrings: PasswordResetEmailStrings = {
        subject: tAuth("passwordResetSubject"),
        greeting: `${tAuth("emailGreeting")} ${user.name || ""}`.trim(),
        bodyText: tAuth("passwordResetBody"),
        buttonText: tAuth("passwordResetButton"),
        expiryText: tAuth("passwordResetExpiry"),
        fallbackText: tAuth("passwordResetFallback"),
        footerAuto: tAuth("passwordResetFooterAuto"),
      };
      await sendPasswordResetEmail(user.email, user.name || "User", resetUrl, resetStrings);
    } catch {
      // Email not configured — token was created but email not sent.
      // In production, EMAIL_USER and EMAIL_PASS must be set.
    }

    return {
      success: true,
      data: { message: "If that email exists, a reset link has been sent" },
    };
  } catch {
    return {
      success: false,
      error: "Failed to process password reset request",
    };
  }
}

/**
 * Reset password using a valid token.
 * Validates token, updates password, and deletes token.
 */
export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Invalid input",
      };
    }

    const { token, password } = parsed.data;

    // Find valid token (not expired)
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(eq(passwordResetTokens.token, token), gt(passwordResetTokens.expiresAt, new Date())),
      );

    if (!resetToken) {
      return {
        success: false,
        error: "Invalid or expired reset token",
      };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password + delete token atomically
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, resetToken.userId));

      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));
    });

    return {
      success: true,
      data: { message: "Password has been reset successfully" },
    };
  } catch {
    return {
      success: false,
      error: "Failed to reset password",
    };
  }
}
