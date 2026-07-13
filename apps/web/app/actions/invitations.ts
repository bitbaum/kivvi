"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth as getAuthSession } from "@/lib/auth";
import { safeErrorMessage } from "./utils";
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
import {
  companies,
  invitations,
  users,
  INVITABLE_ROLES,
  INVITABLE_PERMISSION_PRESET_VALUES,
} from "@kivvi/database";
import type { PermissionPresetValue } from "@kivvi/database/src/enums";
import { and, eq } from "drizzle-orm";
import {
  buildInvitationEmailHtml,
  buildInvitationEmailSubject,
  type InvitationEmailStrings,
} from "@kivvi/core/src/domain/email";
import { escapeHtml } from "@kivvi/core/src/utils/html";
import { getTransporter, getFromEmail } from "@/lib/email/transporter";
import { isEmailConfigured } from "@/lib/config/email";

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Invite a member by email to the current company.
 */
export const inviteMemberAction = createAction<
  unknown,
  { id: string; token: string; inviteUrl: string }
>({
  translateDomainErrors: true,
  handler: async (input, { companyId, userId, db }) => {
    const t = await getTranslations("team");
    const tc = await getTranslations("common");

    const parsed = z
      .object({
        email: z.string().email(t("emailInvalid")),
        role: z.enum(INVITABLE_ROLES).default("member"),
        permissionPreset: z
          .enum(INVITABLE_PERMISSION_PRESET_VALUES)
          .default("sales"),
      })
      .safeParse(input);

    if (!parsed.success) {
      throw new Error(
        parsed.error.errors[0]?.message || t("errorSendInvitation"),
      );
    }

    const invitation = await createInvitation(
      db,
      companyId,
      userId,
      parsed.data.email,
      parsed.data.role as MembershipRole,
      parsed.data.permissionPreset as PermissionPresetValue,
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

        const baseUrl = process.env.NEXTAUTH_URL || "https://kivvi.ch";
        const acceptUrl = `${baseUrl}/invite/${invitation.token}`;

        const emailData = {
          inviterName: inviter?.name || t("fallbackTeamMember"),
          companyName: company?.name || tc("unknown"),
          acceptUrl,
          role:
            tc(`permissionPresetLabel.${parsed.data.permissionPreset}`) ??
            parsed.data.permissionPreset,
        };

        const invStrings: InvitationEmailStrings = {
          subject: t("invitationSubject", {
            company: emailData.companyName,
          }),
          greeting: t("invitationGreeting"),
          bodyHtml: t("invitationBody", {
            inviter: `<strong>${escapeHtml(emailData.inviterName)}</strong>`,
            company: `<strong>${escapeHtml(emailData.companyName)}</strong>`,
          }),
          roleText: `${t("role")}: <strong>${escapeHtml(emailData.role)}</strong>`,
          buttonText: t("invitationButton"),
          expiryText: t("invitationExpiry"),
          fallbackText: t("invitationFallback"),
          footerAuto: tc("emailFooterAuto"),
        };

        const transporter = getTransporter();
        await transporter.sendMail({
          from: `Kivvi <${getFromEmail()}>`,
          to: parsed.data.email,
          subject: buildInvitationEmailSubject(emailData, invStrings),
          html: buildInvitationEmailHtml(emailData, invStrings),
        });
      } catch {
        // Email sending failed — invitation is still created, user can share the link manually
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://kivvi.ch";
    return {
      id: invitation.id,
      token: invitation.token,
      inviteUrl: `${baseUrl}/invite/${invitation.token}`,
    };
  },
  revalidate: ["/settings/team"],
  errorMessage: () =>
    getTranslations("team").then((t) => t("errorSendInvitation")),
  minRole: "admin",
});

/**
 * Revoke a pending invitation.
 */
export const revokeInvitationAction = createAction<string, void>({
  minRole: "admin",
  revalidate: ["/settings/team"],
  errorMessage: () => getTranslations("team").then((t) => t("revokeFailed")),
  handler: async (invitationId, { companyId, db }) => {
    const parsed = z.string().uuid().safeParse(invitationId);
    if (!parsed.success) throw new Error("bad_invitation_id");
    await revokeInvitation(db, companyId, parsed.data);
  },
});

/**
 * List pending invitations for the current company.
 */
export const getInvitationsAction = createAction<void, PendingInvitation[]>({
  errorMessage: () =>
    getTranslations("team").then((t) => t("errorLoadInvitation")),
  handler: async (_input, { companyId, db }) =>
    getCompanyInvitations(db, companyId),
});

/**
 * Accept an invitation (logged-in user).
 */
export async function acceptInvitationAction(
  token: unknown,
): Promise<ActionResult<{ companyId: string; companyName: string }>> {
  const t = await getTranslations("team");
  const tDomain = await getTranslations("domainErrors");
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const parsed = z.string().min(1).safeParse(token);
    if (!parsed.success) throw new Error("bad_token");
    const result = await acceptInvitation(db, parsed.data, session.user.id);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("acceptFailed"), (code, params) =>
        tDomain(code as Parameters<typeof tDomain>[0], params),
      ),
    };
  }
}

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

export async function getMyPendingInvitationsAction(): Promise<
  ActionResult<
    Array<PendingInvitation & { companyName: string; inviteUrl: string }>
  >
> {
  const t = await getTranslations("team");
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) throw new Error("Unauthorized");

    const normalizedEmail = session.user.email.toLowerCase().trim();
    const baseUrl = process.env.NEXTAUTH_URL || "https://kivvi.ch";
    const rows = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        permissionPreset: invitations.permissionPreset,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        inviterName: users.name,
        token: invitations.token,
        companyName: companies.name,
      })
      .from(invitations)
      .innerJoin(companies, eq(invitations.companyId, companies.id))
      .innerJoin(users, eq(invitations.invitedBy, users.id))
      .where(
        and(
          eq(invitations.email, normalizedEmail),
          eq(invitations.status, "pending"),
        ),
      );

    return {
      success: true,
      data: rows.map((row) => ({
        ...row,
        permissionPreset:
          row.permissionPreset as PendingInvitation["permissionPreset"],
        inviteUrl: `${baseUrl}/invite/${row.token}`,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorLoadInvitation")),
    };
  }
}
