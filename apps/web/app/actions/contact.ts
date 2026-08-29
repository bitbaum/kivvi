"use server";

import { z } from "zod";
import { escapeHtml } from "@kivvi/core/src/utils/html";
import { db } from "@/lib/db";
import { contactSubmissions } from "@kivvi/database";
import { type ActionResult, safeErrorMessage } from "./utils";
import { logger } from "@/lib/logger";
import { isEmailConfigured } from "@/lib/config/email";
import { getTransporter, getFromEmail } from "@/lib/email/transporter";
import { CONTACT_EMAIL } from "@/lib/config/site";
import { getTranslations } from "next-intl/server";

export type ContactFormInput = {
  name: string;
  email: string;
  organisation?: string;
  betriebstyp?: "it_refurbisher" | "brockenshaus" | "repair_cafe" | "vintage_shop" | "other";
  message?: string;
  type?: "demo_request" | "waitlist" | "general";
};

// ============================================================================
// SERVER ACTION
// ============================================================================

export async function submitContactFormAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("landing.contact.form");
  try {
    const contactFormSchema = z.object({
      name: z.string().min(2, t("nameMinLength")),
      email: z.string().email(t("emailInvalid")),
      organisation: z.string().optional(),
      betriebstyp: z
        .enum(["it_refurbisher", "brockenshaus", "repair_cafe", "vintage_shop", "other"])
        .optional(),
      message: z.string().max(2000).optional(),
      type: z.enum(["demo_request", "waitlist", "general"]).optional().default("demo_request"),
    });
    // Validate input
    const parsed = contactFormSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: firstError.message };
    }

    const { name, email, organisation, betriebstyp, message, type } = parsed.data;

    // Insert into DB
    const [submission] = await db
      .insert(contactSubmissions)
      .values({
        name,
        email,
        organisation: organisation ?? null,
        betriebstyp: betriebstyp ?? null,
        message: message ?? null,
        type,
      })
      .returning({ id: contactSubmissions.id });

    // Send notification email — silent failure
    if (isEmailConfigured()) {
      try {
        const transporter = getTransporter();
        const from = getFromEmail();

        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const betriebstypLabel = escapeHtml(betriebstyp ?? "—");
        const organisationLine = organisation
          ? `<tr><td><strong>Organisation:</strong></td><td>${escapeHtml(organisation)}</td></tr>`
          : "";
        const messageLine = message
          ? `<tr><td><strong>Nachricht:</strong></td><td>${escapeHtml(message).replace(/\n/g, "<br>")}</td></tr>`
          : "";

        await transporter.sendMail({
          from,
          to: CONTACT_EMAIL,
          subject: `Neue Kontaktanfrage von ${safeName}`,
          html: `
            <h2>Neue Kontaktanfrage</h2>
            <table cellpadding="6" cellspacing="0">
              <tr><td><strong>Name:</strong></td><td>${safeName}</td></tr>
              <tr><td><strong>E-Mail:</strong></td><td>${safeEmail}</td></tr>
              ${organisationLine}
              <tr><td><strong>Betriebstyp:</strong></td><td>${betriebstypLabel}</td></tr>
              <tr><td><strong>Typ:</strong></td><td>${escapeHtml(type)}</td></tr>
              ${messageLine}
            </table>
          `,
        });
      } catch (emailError) {
        logger.warn("[contactFormAction] Failed to send notification email", emailError);
      }
    }

    return { success: true, data: { id: submission.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorSubmitFailed")),
    };
  }
}
