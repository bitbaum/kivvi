import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { memberships, users, companies } from '@kivvi/database';
import type { Database } from '@kivvi/database';
import type { MembershipRole } from '@kivvi/database';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const updateMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

export const switchCompanySchema = z.object({
  companyId: z.string().uuid(),
});

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface MembershipInfo {
  companyId: string;
  companyName: string;
  role: MembershipRole;
}

export interface CompanyMember {
  userId: string;
  name: string | null;
  email: string;
  role: MembershipRole;
  joinedAt: Date;
}

// ============================================================================
// DOMAIN FUNCTIONS
// ============================================================================

/**
 * Get all memberships for a user (for company switcher).
 */
export async function getUserMemberships(
  db: Database,
  userId: string
): Promise<MembershipInfo[]> {
  const rows = await db
    .select({
      companyId: memberships.companyId,
      companyName: companies.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(companies, eq(memberships.companyId, companies.id))
    .where(eq(memberships.userId, userId));

  return rows;
}

/**
 * Get all members of a company (for team management).
 */
export async function getCompanyMembers(
  db: Database,
  companyId: string
): Promise<CompanyMember[]> {
  const rows = await db
    .select({
      userId: memberships.userId,
      name: users.name,
      email: users.email,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.companyId, companyId));

  return rows;
}

/**
 * Add a member to a company (used when accepting an invitation).
 */
export async function addMember(
  db: Database,
  companyId: string,
  userId: string,
  role: MembershipRole = 'member'
) {
  const [membership] = await db
    .insert(memberships)
    .values({ userId, companyId, role })
    .returning();

  return membership;
}

/**
 * Remove a member from a company.
 * Guard: cannot remove the last owner.
 */
export async function removeMember(
  db: Database,
  companyId: string,
  userId: string,
  requestedBy: string
): Promise<void> {
  // Find the membership to remove
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.companyId, companyId),
      eq(memberships.userId, userId)
    ),
  });

  if (!membership) {
    throw new Error('Membership not found');
  }

  // If removing an owner, ensure there's at least one other owner
  if (membership.role === 'owner') {
    const owners = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(
        eq(memberships.companyId, companyId),
        eq(memberships.role, 'owner')
      ));

    if (owners.length <= 1) {
      throw new Error('Cannot remove the last owner. Transfer ownership first.');
    }
  }

  await db
    .delete(memberships)
    .where(and(
      eq(memberships.companyId, companyId),
      eq(memberships.userId, userId)
    ));

  // If the removed user's active company is this one, clear it
  if (userId !== requestedBy) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (user?.companyId === companyId) {
      // Find another company the user belongs to, or null
      const otherMembership = await db.query.memberships.findFirst({
        where: eq(memberships.userId, userId),
      });
      await db
        .update(users)
        .set({ companyId: otherMembership?.companyId ?? null })
        .where(eq(users.id, userId));
    }
  }
}

/**
 * Update a member's role.
 * Guard: only owner/admin can change roles, cannot demote the last owner.
 */
export async function updateMemberRole(
  db: Database,
  companyId: string,
  userId: string,
  newRole: MembershipRole,
  requestedBy: string
): Promise<void> {
  // Verify requester has permission
  const requesterMembership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.companyId, companyId),
      eq(memberships.userId, requestedBy)
    ),
  });

  if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
    throw new Error('Unauthorized: only owners and admins can change roles');
  }

  // Only owners can promote to owner/admin
  if (['owner', 'admin'].includes(newRole) && requesterMembership.role !== 'owner') {
    throw new Error('Unauthorized: only owners can promote to owner or admin');
  }

  // Find the target membership
  const targetMembership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.companyId, companyId),
      eq(memberships.userId, userId)
    ),
  });

  if (!targetMembership) {
    throw new Error('Membership not found');
  }

  // If demoting from owner, ensure there's at least one other owner
  if (targetMembership.role === 'owner' && newRole !== 'owner') {
    const owners = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(
        eq(memberships.companyId, companyId),
        eq(memberships.role, 'owner')
      ));

    if (owners.length <= 1) {
      throw new Error('Cannot demote the last owner. Promote another member to owner first.');
    }
  }

  await db
    .update(memberships)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(memberships.id, targetMembership.id));
}

/**
 * Switch active company for a user. Updates users.companyId.
 * Guard: user must have a membership in the target company.
 */
export async function switchCompany(
  db: Database,
  userId: string,
  targetCompanyId: string
): Promise<{ companyId: string; companyName: string; role: MembershipRole }> {
  // Verify membership exists
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, userId),
      eq(memberships.companyId, targetCompanyId)
    ),
  });

  if (!membership) {
    throw new Error('You are not a member of this company');
  }

  // Update active company pointer
  await db
    .update(users)
    .set({ companyId: targetCompanyId })
    .where(eq(users.id, userId));

  // Get company name
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, targetCompanyId),
  });

  return {
    companyId: targetCompanyId,
    companyName: company?.name ?? '',
    role: membership.role,
  };
}
