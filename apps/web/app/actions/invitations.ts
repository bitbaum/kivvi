"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, requireRole, safeErrorMessage } from "./utils";
import type { ActionResult } from "./utils";
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

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Mitglied",
  viewer: "Betrachter",
};

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Invite a member by email to the current company.
 */
export async function inviteMemberAction(
  input: unknown,
): Promise<ActionResult<{ id: string; token: string }>> {
  try {
    const { companyId, userId } = await requireRole("admin");

    const parsed = z
      .object({
        email: z.string().email("Invalid email address"),
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
          inviterName: inviter?.name || "Ein Teammitglied",
          companyName: company?.name || "Unbekannt",
          acceptUrl,
          role: ROLE_LABELS[parsed.data.role] || parsed.data.role,
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
      error: safeErrorMessage(error, "Failed to send invitation"),
    };
  }
}

/**
 * Revoke a pending invitation.
 */
export async function revokeInvitationAction(
  invitationId: unknown,
): Promise<ActionResult> {
  try {
    const { companyId } = await requireRole("admin");
    const parsed = z.string().uuid().safeParse(invitationId);
    if (!parsed.success) {
      return { success: false, error: "Invalid invitation ID" };
    }

    await revokeInvitation(db, companyId, parsed.data);
    revalidatePath("/settings/team");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to revoke invitation"),
    };
  }
}

/**
 * List pending invitations for the current company.
 */
export async function getInvitationsAction(): Promise<
  ActionResult<PendingInvitation[]>
> {
  try {
    const { companyId } = await getSession();
    const data = await getCompanyInvitations(db, companyId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to load invitations"),
    };
  }
}

/**
 * Accept an invitation (logged-in user).
 */
export async function acceptInvitationAction(
  token: unknown,
): Promise<ActionResult<{ companyId: string; companyName: string }>> {
  try {
    const { userId } = await getSession();
    const parsed = z.string().min(1).safeParse(token);
    if (!parsed.success) {
      return { success: false, error: "Invalid token" };
    }

    const result = await acceptInvitation(db, parsed.data, userId);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to accept invitation"),
    };
  }
}

/**
 * Get invitation details by token (for the accept page, no auth required).
 */
export async function getInvitationDetailsAction(
  token: unknown,
): Promise<ActionResult<InvitationWithCompany>> {
  try {
    const parsed = z.string().min(1).safeParse(token);
    if (!parsed.success) {
      return { success: false, error: "Invalid token" };
    }

    const invitation = await getInvitationByToken(db, parsed.data);
    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    return { success: true, data: invitation };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to load invitation"),
    };
  }
}
