"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, safeErrorMessage } from "./utils";
import type { ActionResult } from "./utils";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";
import {
  createInvitation,
  revokeInvitation,
  getCompanyInvitations,
  acceptInvitation,
  getInvitationByToken,
} from "@kivvi/core/src/domain/invitations";
import type {
  PendingInvitation,
  InvitationWithCompany,
} from "@kivvi/core/src/domain/invitations";
import type { MembershipRole } from "@kivvi/database";
import { companies, users, INVITABLE_ROLES } from "@kivvi/database";
import { eq } from "drizzle-orm";
import {
  buildInvitationEmailHtml,
  buildInvitationEmailSubject,
} from "@kivvi/core/src/domain/email";
import { getTransporter, getFromEmail } from "@/lib/email/transporter";
import { isEmailConfigured } from "@/lib/config/email";

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Invite a member by email to the current company.
 */
export async function inviteMemberAction(
  input: unknown,
): Promise<ActionResult<{ id: string; token: string }>> {
  const t = await getTranslations("team");
  const tc = await getTranslations("common");
  try {
    const { companyId, userId } = await requireRole("admin");

    const parsed = z
      .object({
        email: z.string().email(t("emailInvalid")),
        role: z.enum(INVITABLE_ROLES).default("member"),
      })
      .safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Validation failed",
      };
    }

    const invitation = await createInvitation(
      db,
      companyId,
      userId,
      parsed.data.email,
      parsed.data.role as MembershipRole,
    );

    // Send invitation email (best-effort — don't fail the action if email fails)
    if (isEmailConfigured()) {
      try {
        const [company] = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, companyId));
        const [inviter] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, userId));

        const baseUrl = process.env.NEXTAUTH_URL || "https://kivvi.vercel.app";
        const acceptUrl = `${baseUrl}/invite/${invitation.token}`;

        const emailData = {
          inviterName: inviter?.name || t("fallbackTeamMember"),
          companyName: company?.name || tc("unknown"),
          acceptUrl,
          role:
            {
              owner: tc("roleLabel.owner"),
              admin: tc("roleLabel.admin"),
              member: tc("roleLabel.member"),
              viewer: tc("roleLabel.viewer"),
            }[parsed.data.role] ?? parsed.data.role,
        };

        const transporter = getTransporter();
        await transporter.sendMail({
          from: `Kivvi <${getFromEmail()}>`,
          to: parsed.data.email,
          subject: buildInvitationEmailSubject(emailData),
          html: buildInvitationEmailHtml(emailData),
        });
      } catch {
        // Email sending failed — invitation is still created, user can share the link manually
      }
    }

    revalidatePath("/settings/team");
    return {
      success: true,
      data: { id: invitation.id, token: invitation.token },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorSendInvitation")),
    };
  }
}

/**
 * Revoke a pending invitation.
 */
export const revokeInvitationAction = createAction<unknown, void>({
  minRole: "admin",
  revalidate: ["/settings/team"],
  errorMessage: "Failed to revoke invitation",
  handler: async (invitationId, { companyId, db }) => {
    const parsed = z.string().uuid().safeParse(invitationId);
    if (!parsed.success) throw new Error("Invalid invitation ID");
    await revokeInvitation(db, companyId, parsed.data);
  },
});

/**
 * List pending invitations for the current company.
 */
export const getInvitationsAction = createAction<void, PendingInvitation[]>({
  errorMessage: "Failed to load invitations",
  handler: async (_input, { companyId, db }) =>
    getCompanyInvitations(db, companyId),
});

/**
 * Accept an invitation (logged-in user).
 */
export const acceptInvitationAction = createAction<
  unknown,
  { companyId: string; companyName: string }
>({
  errorMessage: "Failed to accept invitation",
  handler: async (token, { userId, db }) => {
    const parsed = z.string().min(1).safeParse(token);
    if (!parsed.success) throw new Error("Invalid token");
    return acceptInvitation(db, parsed.data, userId);
  },
});

/**
 * Get invitation details by token (for the accept page, no auth required).
 */
export async function getInvitationDetailsAction(
  token: unknown,
): Promise<ActionResult<InvitationWithCompany>> {
  const t = await getTranslations("team");
  try {
    const parsed = z.string().min(1).safeParse(token);
    if (!parsed.success) {
      return { success: false, error: t("errorInvalidToken") };
    }

    const invitation = await getInvitationByToken(db, parsed.data);
    if (!invitation) {
      return { success: false, error: t("errorInvitationNotFound") };
    }

    return { success: true, data: invitation };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorLoadInvitation")),
    };
  }
}
