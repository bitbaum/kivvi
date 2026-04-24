"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, users } from "@kivvi/database";
import { getPublicCompanyBySlug } from "@kivvi/core/src/domain/shop";
import { getTransporter, getFromEmail } from "@/lib/email/transporter";
import { isEmailConfigured } from "@/lib/config/email";
import type { ActionResult } from "./utils";

const sendShopInquirySchema = z.object({
  companyId: z.string().uuid(),
  itemId: z.string().uuid(),
  itemDescription: z.string().max(500),
  slug: z.string().max(100),
  senderName: z.string().min(1).max(200),
  senderEmail: z.string().email().max(200),
  message: z.string().max(2000).optional(),
});

export async function sendShopInquiryAction(
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    const parsed = sendShopInquirySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Ungültige Eingabe." };
    }

    const {
      companyId,
      itemId,
      itemDescription,
      slug,
      senderName,
      senderEmail,
      message,
    } = parsed.data;

    if (!isEmailConfigured()) {
      // Silently succeed — company hasn't configured email yet
      return { success: true };
    }

    // Find company owner/admin to notify
    const [admin] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.companyId, companyId))
      .limit(1);

    if (!admin) {
      return { success: true }; // No one to notify
    }

    const companyRow = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .then((rows) => rows[0]);

    const companyName = companyRow?.name ?? "Ihr Shop";
    const itemUrl = `${process.env.NEXTAUTH_URL ?? ""}/shop/${slug}/${itemId}`;

    const transporter = getTransporter();
    await transporter.sendMail({
      from: getFromEmail(),
      to: admin.email,
      replyTo: `"${senderName}" <${senderEmail}>`,
      subject: `Neue Anfrage: ${itemDescription}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111;">Neue Shop-Anfrage</h2>
          <p>Sie haben eine neue Anfrage für einen Artikel in Ihrem Shop erhalten.</p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Artikel:</strong> ${itemDescription}</p>
            <p style="margin: 0;">
              <a href="${itemUrl}" style="color: #6366f1;">Artikel ansehen →</a>
            </p>
          </div>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Von:</strong> ${senderName}</p>
            <p style="margin: 0 0 8px;"><strong>E-Mail:</strong> <a href="mailto:${senderEmail}">${senderEmail}</a></p>
            ${message ? `<p style="margin: 8px 0 0;"><strong>Nachricht:</strong><br>${message.replace(/\n/g, "<br>")}</p>` : ""}
          </div>

          <p style="color: #888; font-size: 12px;">
            Diese Anfrage wurde über den öffentlichen Shop von ${companyName} gesendet.
            Antworten Sie direkt auf diese E-Mail, um ${senderName} zu kontaktieren.
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("sendShopInquiryAction error:", error);
    return { success: false, error: "Fehler beim Senden der Anfrage." };
  }
}
