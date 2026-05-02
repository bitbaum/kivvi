"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, safeErrorMessage } from "./utils";
import type { ActionResult } from "./utils";
import {
  getUserMemberships,
  getCompanyMembers,
  removeMember,
  updateMemberRole,
  switchCompany,
  switchCompanySchema,
  createCompanyForUser,
  createCompanySchema,
} from "@kivvi/core/src/domain/memberships";
import type {
  MembershipInfo,
  CompanyMember,
} from "@kivvi/core/src/domain/memberships";
import { MEMBERSHIP_ROLES } from "@kivvi/database";
import type { MembershipRole } from "@kivvi/database";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Get all companies the current user belongs to (for company switcher).
 */
export async function getMyMembershipsAction(): Promise<
  ActionResult<MembershipInfo[]>
> {
  const t = await getTranslations("team");
  try {
    const { userId } = await getSession();
    const data = await getUserMemberships(db, userId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorLoadMemberships")),
    };
  }
}

/**
 * Switch the user's active company. Updates users.companyId and refreshes JWT.
 */
export async function switchCompanyAction(
  companyId: unknown,
): Promise<ActionResult<{ companyId: string; companyName: string }>> {
  const t = await getTranslations("team");
  try {
    const { userId } = await getSession();
    const parsed = switchCompanySchema.shape.companyId.safeParse(companyId);
    if (!parsed.success) {
      return { success: false, error: t("errorInvalidCompanyId") };
    }

    const result = await switchCompany(db, userId, parsed.data);
    return {
      success: true,
      data: { companyId: result.companyId, companyName: result.companyName },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorSwitchCompany")),
    };
  }
}

/**
 * Get all members of the current company (for team management page).
 */
export async function getTeamMembersAction(): Promise<
  ActionResult<CompanyMember[]>
> {
  const t = await getTranslations("team");
  try {
    const { companyId } = await getSession();
    const data = await getCompanyMembers(db, companyId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorLoadTeamMembers")),
    };
  }
}

/**
 * Remove a member from the current company.
 */
export const removeMemberAction = createAction<unknown, void>({
  handler: async (userId, { companyId, userId: currentUserId, db }) => {
    const parsed = z.string().uuid().safeParse(userId);
    if (!parsed.success) throw new Error("Invalid user ID");
    await removeMember(db, companyId, parsed.data, currentUserId);
  },
  revalidate: ["/settings/team"],
  errorMessage: () => getTranslations("team").then((t) => t("removeFailed")),
  minRole: "admin",
});

/**
 * Update a member's role in the current company.
 */
export const updateMemberRoleAction = createAction<
  { userId: unknown; role: unknown },
  void
>({
  handler: async (
    { userId, role },
    { companyId, userId: currentUserId, db },
  ) => {
    const parsedUserId = z.string().uuid().safeParse(userId);
    const parsedRole = z.enum(MEMBERSHIP_ROLES).safeParse(role);
    if (!parsedUserId.success) throw new Error("Invalid user ID");
    if (!parsedRole.success) throw new Error("Invalid role");
    await updateMemberRole(
      db,
      companyId,
      parsedUserId.data,
      parsedRole.data as MembershipRole,
      currentUserId,
    );
  },
  revalidate: ["/settings/team"],
  errorMessage: () =>
    getTranslations("team").then((t) => t("roleChangeFailed")),
  minRole: "admin",
});

/**
 * Create a new company for the current user. User becomes owner.
 * New company starts un-onboarded → middleware redirects to /onboarding.
 */
export const createCompanyAction = createAction<
  unknown,
  { companyId: string; companyName: string }
>({
  handler: async (input, { userId, db }) => {
    const parsed = createCompanySchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Validation failed");
    return createCompanyForUser(db, userId, parsed.data.companyName);
  },
  errorMessage: () =>
    getTranslations("team").then((t) => t("errorCreateCompany")),
});
