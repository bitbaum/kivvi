'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession, safeErrorMessage } from './utils';
import type { ActionResult } from './utils';
import {
  getUserMemberships,
  getCompanyMembers,
  removeMember,
  updateMemberRole,
  switchCompany,
} from '@kivvi/core/src/domain/memberships';
import type { MembershipInfo, CompanyMember } from '@kivvi/core/src/domain/memberships';
import type { MembershipRole } from '@kivvi/database';

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Get all companies the current user belongs to (for company switcher).
 */
export async function getMyMembershipsAction(): Promise<ActionResult<MembershipInfo[]>> {
  try {
    const { userId } = await getSession();
    const data = await getUserMemberships(db, userId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to load memberships') };
  }
}

/**
 * Switch the user's active company. Updates users.companyId and refreshes JWT.
 */
export async function switchCompanyAction(
  companyId: unknown
): Promise<ActionResult<{ companyId: string; companyName: string }>> {
  try {
    const { userId } = await getSession();
    const parsed = z.string().uuid().safeParse(companyId);
    if (!parsed.success) {
      return { success: false, error: 'Invalid company ID' };
    }

    const result = await switchCompany(db, userId, parsed.data);
    return { success: true, data: { companyId: result.companyId, companyName: result.companyName } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to switch company') };
  }
}

/**
 * Get all members of the current company (for team management page).
 */
export async function getTeamMembersAction(): Promise<ActionResult<CompanyMember[]>> {
  try {
    const { companyId } = await getSession();
    const data = await getCompanyMembers(db, companyId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to load team members') };
  }
}

/**
 * Remove a member from the current company.
 */
export async function removeMemberAction(
  userId: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const parsed = z.string().uuid().safeParse(userId);
    if (!parsed.success) {
      return { success: false, error: 'Invalid user ID' };
    }

    await removeMember(db, session.companyId, parsed.data, session.userId);
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to remove member') };
  }
}

/**
 * Update a member's role in the current company.
 */
export async function updateMemberRoleAction(
  userId: unknown,
  role: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const parsedUserId = z.string().uuid().safeParse(userId);
    const parsedRole = z.enum(['owner', 'admin', 'member', 'viewer']).safeParse(role);

    if (!parsedUserId.success) return { success: false, error: 'Invalid user ID' };
    if (!parsedRole.success) return { success: false, error: 'Invalid role' };

    await updateMemberRole(
      db,
      session.companyId,
      parsedUserId.data,
      parsedRole.data as MembershipRole,
      session.userId
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update role') };
  }
}
