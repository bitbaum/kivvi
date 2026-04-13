"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { contactSubmissions } from "@kivvi/database";
import { type ActionResult, safeErrorMessage } from "./utils";
import { isEmailConfigured } from "@/lib/config/email";
import { getTransporter, getFromEmail } from "@/lib/email/transporter";
import { CONTACT_EMAIL } from "@/lib/config/site";

// ============================================================================
// VALIDATION
// ============================================================================

const contactFormSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen haben"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  organisation: z.string().optional(),
  betriebstyp: z
    .enum([
      "it_refurbisher",
      "brockenshaus",
      "repair_cafe",
      "vintage_shop",
      "other",
    ])
    .optional(),
  message: z
    .string()
    .max(2000, "Nachricht darf maximal 2000 Zeichen haben")
    .optional(),
  type: z
    .enum(["demo_request", "waitlist", "general"])
    .optional()
    .default("demo_request"),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

// ============================================================================
// SERVER ACTION
// ============================================================================

export async function submitContactFormAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    // Validate input
    const parsed = contactFormSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: firstError.message };
    }

    const { name, email, organisation, betriebstyp, message, type } =
      parsed.data;

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

        const betriebstypLabel = betriebstyp ?? "—";
        const organisationLine = organisation
          ? `<tr><td><strong>Organisation:</strong></td><td>${organisation}</td></tr>`
          : "";
        const messageLine = message
          ? `<tr><td><strong>Nachricht:</strong></td><td>${message.replace(/\n/g, "<br>")}</td></tr>`
          : "";

        await transporter.sendMail({
          from,
          to: CONTACT_EMAIL,
          subject: `Neue Kontaktanfrage von ${name}`,
          html: `
            <h2>Neue Kontaktanfrage</h2>
            <table cellpadding="6" cellspacing="0">
              <tr><td><strong>Name:</strong></td><td>${name}</td></tr>
              <tr><td><strong>E-Mail:</strong></td><td>${email}</td></tr>
              ${organisationLine}
              <tr><td><strong>Betriebstyp:</strong></td><td>${betriebstypLabel}</td></tr>
              <tr><td><strong>Typ:</strong></td><td>${type}</td></tr>
              ${messageLine}
            </table>
          `,
        });
      } catch (emailError) {
        console.error(
          "Failed to send contact form notification email:",
          emailError,
        );
      }
    }

    return { success: true, data: { id: submission.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to submit contact form"),
    };
  }
}
