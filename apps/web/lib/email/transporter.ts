/**
 * Email Transport
 *
 * Prefers the fleet-standard Resend path via @bitbaum/mail-kit whenever it is
 * configured (RESEND_API_KEY set and not a placeholder), falling back to Brevo
 * SMTP via nodemailer otherwise. The Resend path exists because the deployed
 * Brevo credential answers "Login denied" (live-probed 2026-09-05), which
 * silently killed every invoice, dunning, invitation and auth email in
 * production.
 *
 * The mail-kit transport mirrors nodemailer's sendMail/verify surface so the
 * eight existing call sites need no changes.
 */

import nodemailer, { type Transporter } from "nodemailer";
import {
  sendMail as mailKitSendMail,
  mailHealth,
  isMailConfigured,
  fromAddress,
  conventionalFrom,
} from "@bitbaum/mail-kit";
import { EMAIL_CONFIG } from "@/lib/config/email";

/** The subset of nodemailer's mail options this app actually uses. */
export interface MailMessage {
  from: string;
  to: string;
  cc?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer | string; contentType?: string }[];
}

export interface MailTransport {
  sendMail(message: MailMessage): Promise<{ messageId?: string }>;
  verify(): Promise<true>;
}

function isResendActive(): boolean {
  return isMailConfigured();
}

function createResendTransport(): MailTransport {
  return {
    async sendMail(message) {
      // mail-kit never throws; the old transport did and every call site
      // catches, so the adapter re-raises failures to preserve that contract.
      const result = await mailKitSendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
        ...(message.cc ? { cc: message.cc } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        ...(message.attachments
          ? {
              attachments: message.attachments.map((a) => ({
                filename: a.filename,
                // mail-kit treats string content as already-base64; our call
                // sites pass raw bytes/strings, so hand it bytes explicitly.
                content: typeof a.content === "string" ? Buffer.from(a.content) : a.content,
                ...(a.contentType ? { contentType: a.contentType } : {}),
              })),
            }
          : {}),
      });

      if (!result.sent) {
        throw new Error(`Resend send failed: ${result.error}`);
      }
      return { messageId: result.id };
    },

    async verify() {
      const health = await mailHealth();
      if (!health.ok) {
        throw new Error(`Resend health check failed: ${health.error ?? "unknown"}`);
      }
      return true;
    },
  };
}

// Singleton transport instance
let transport: MailTransport | null = null;

/**
 * Get or create the mail transport (Resend when configured, else SMTP).
 */
export function getTransporter(): MailTransport {
  if (!transport) {
    if (isResendActive()) {
      transport = createResendTransport();
    } else {
      const smtp: Transporter = nodemailer.createTransport({
        host: EMAIL_CONFIG.HOST,
        port: EMAIL_CONFIG.PORT,
        secure: EMAIL_CONFIG.SECURE,
        auth: {
          user: EMAIL_CONFIG.USER,
          pass: EMAIL_CONFIG.PASS,
        },
      });
      transport = smtp as unknown as MailTransport;
    }
  }
  return transport;
}

/**
 * Test email configuration
 */
export async function testEmailConfig(): Promise<{ success: boolean; error?: string }> {
  try {
    await getTransporter().verify();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get the sender email address (bare address; callers wrap it in a
 * display name). With Resend active the sender must live on the verified
 * fleetcrown domain, so EMAIL_FROM — a plain mailbox in prod — cannot win.
 * Env SSOT is RESEND_FROM (read via mail-kit); the fleet-conventional
 * kivvi@fleetcrown.orangecat.ch is the fallback.
 */
export function getFromEmail(): string {
  if (isResendActive()) {
    const configured = fromAddress() ?? conventionalFrom("Kivvi");
    // RESEND_FROM may be `Name <addr>`; callers add their own display name.
    const match = configured.match(/<([^>]+)>/);
    return (match?.[1] ?? configured).trim();
  }
  return EMAIL_CONFIG.FROM || EMAIL_CONFIG.USER;
}
