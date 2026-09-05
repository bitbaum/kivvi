/**
 * Email Configuration
 *
 * SSOT for email service configuration. Resend (via @bitbaum/mail-kit) is the
 * preferred transport; Brevo SMTP via nodemailer is the fallback.
 */

import { isMailConfigured } from "@bitbaum/mail-kit";

/**
 * SMTP configuration for Brevo
 */
export const EMAIL_CONFIG = {
  HOST: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
  PORT: parseInt(process.env.EMAIL_PORT || "587"),
  SECURE: process.env.EMAIL_SECURE === "true", // false for port 587
  USER: process.env.EMAIL_USER || "",
  PASS: process.env.EMAIL_PASS || "",
  FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER || "",
} as const;

/**
 * Validates that required email configuration is present
 */
export function validateEmailConfig(): void {
  if (isMailConfigured()) {
    // Resend transport needs only a real key; sender has a verified default.
    // (mail-kit rejects placeholder keys, unlike a bare env-var check.)
    return;
  }
  if (!EMAIL_CONFIG.USER) {
    throw new Error("EMAIL_USER is required for email functionality");
  }
  if (!EMAIL_CONFIG.PASS) {
    throw new Error("EMAIL_PASS is required for email functionality");
  }
}

/**
 * Check if email is configured (Resend key, or full SMTP credentials)
 */
export function isEmailConfigured(): boolean {
  return isMailConfigured() || !!(EMAIL_CONFIG.USER && EMAIL_CONFIG.PASS);
}
