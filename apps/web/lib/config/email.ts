/**
 * Email Configuration
 *
 * SSOT for email service configuration using Brevo SMTP via nodemailer.
 */

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
  if (!EMAIL_CONFIG.USER) {
    throw new Error("EMAIL_USER is required for email functionality");
  }
  if (!EMAIL_CONFIG.PASS) {
    throw new Error("EMAIL_PASS is required for email functionality");
  }
}

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return !!(EMAIL_CONFIG.USER && EMAIL_CONFIG.PASS);
}
