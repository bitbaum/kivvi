/**
 * Email Transport
 *
 * Prefers the fleet-standard Resend API whenever RESEND_API_KEY is set,
 * falling back to Brevo SMTP via nodemailer otherwise. The Resend path exists
 * because the deployed Brevo credential answers "Login denied" (live-probed
 * 2026-09-05), which silently killed every invoice, dunning, invitation and
 * auth email in production.
 *
 * The Resend transport mirrors nodemailer's sendMail/verify surface so the
 * eight existing call sites need no changes.
 */

import nodemailer, { type Transporter } from "nodemailer";
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

const RESEND_API_URL = "https://api.resend.com";

/**
 * Default sender when Resend is active. Only fleetcrown.orangecat.ch is
 * verified in the shared Resend account, so like surf-your-life and vitareba
 * we send as <app>@fleetcrown.orangecat.ch until kivvi has its own domain.
 */
const RESEND_DEFAULT_FROM = "kivvi@fleetcrown.orangecat.ch";

function isResendActive(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function createResendTransport(): MailTransport {
  const apiKey = process.env.RESEND_API_KEY ?? "";

  return {
    async sendMail(message) {
      const res = await fetch(`${RESEND_API_URL}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          ...(message.cc ? { cc: [message.cc] } : {}),
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          subject: message.subject,
          html: message.html,
          ...(message.text ? { text: message.text } : {}),
          ...(message.attachments
            ? {
                attachments: message.attachments.map((a) => ({
                  filename: a.filename,
                  content: Buffer.isBuffer(a.content)
                    ? a.content.toString("base64")
                    : Buffer.from(a.content).toString("base64"),
                  ...(a.contentType ? { content_type: a.contentType } : {}),
                })),
              }
            : {}),
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Resend send failed (${res.status}): ${detail.slice(0, 200)}`);
      }

      const body = (await res.json()) as { id?: string };
      return { messageId: body.id };
    },

    async verify() {
      const res = await fetch(`${RESEND_API_URL}/domains`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        throw new Error(`Resend API returned ${res.status}`);
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
 */
export function getFromEmail(): string {
  if (isResendActive()) {
    return process.env.RESEND_FROM_EMAIL || RESEND_DEFAULT_FROM;
  }
  return EMAIL_CONFIG.FROM || EMAIL_CONFIG.USER;
}
