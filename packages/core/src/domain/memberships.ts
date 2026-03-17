import { z } from "zod";
import { eq, and } from "drizzle-orm";
import {
  memberships,
  users,
  companies,
  MEMBERSHIP_ROLES,
} from "@kivvi/database";
import type { Database } from "@kivvi/database";
import type { MembershipRole } from "@kivvi/database";
import { DEFAULT_VAT_RATE } from "../config/vat-rates";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const updateMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(MEMBERSHIP_ROLES),
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
 * Find a user's membership in a specific company. Returns null if not found.
 * Used across auth, role checks, and company switching.
 */
export async function findMembership(
  db: Database,
  userId: string,
  companyId: string,
) {
  return db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, userId),
      eq(memberships.companyId, companyId),
    ),
  });
}

/**
 * Get all memberships for a user (for company switcher).
 */
export async function getUserMemberships(
  db: Database,
  userId: string,
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
  companyId: string,
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
  role: MembershipRole = "member",
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
  requestedBy: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const membership = await findMembership(tx, userId, companyId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    // If removing an owner, ensure there's at least one other owner
    if (membership.role === "owner") {
      const owners = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.companyId, companyId),
            eq(memberships.role, "owner"),
          ),
        );

      if (owners.length <= 1) {
        throw new Error(
          "Cannot remove the last owner. Transfer ownership first.",
        );
      }
    }

    await tx
      .delete(memberships)
      .where(
        and(
          eq(memberships.companyId, companyId),
          eq(memberships.userId, userId),
        ),
      );

    // If the removed user's active company is this one, clear it
    if (userId !== requestedBy) {
      const user = await tx.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (user?.companyId === companyId) {
        // Find another company the user belongs to, or null
        const otherMembership = await tx.query.memberships.findFirst({
          where: eq(memberships.userId, userId),
        });
        await tx
          .update(users)
          .set({ companyId: otherMembership?.companyId ?? null })
          .where(eq(users.id, userId));
      }
    }
  });
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
  requestedBy: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    // Verify requester has permission
    const requesterMembership = await findMembership(
      tx,
      requestedBy,
      companyId,
    );
    if (
      !requesterMembership ||
      !["owner", "admin"].includes(requesterMembership.role)
    ) {
      throw new Error("Unauthorized: only owners and admins can change roles");
    }

    // Only owners can promote to owner/admin
    if (
      ["owner", "admin"].includes(newRole) &&
      requesterMembership.role !== "owner"
    ) {
      throw new Error(
        "Unauthorized: only owners can promote to owner or admin",
      );
    }

    const targetMembership = await findMembership(tx, userId, companyId);
    if (!targetMembership) {
      throw new Error("Membership not found");
    }

    // If demoting from owner, ensure there's at least one other owner
    if (targetMembership.role === "owner" && newRole !== "owner") {
      const owners = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.companyId, companyId),
            eq(memberships.role, "owner"),
          ),
        );

      if (owners.length <= 1) {
        throw new Error(
          "Cannot demote the last owner. Promote another member to owner first.",
        );
      }
    }

    await tx
      .update(memberships)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(memberships.id, targetMembership.id));
  });
}

export const createCompanySchema = z.object({
  companyName: z.string().min(2).max(200),
});

/**
 * Create a new company with owner membership inside an existing transaction.
 * Used by both registration (auth.ts) and self-service company creation.
 */
export async function createOwnedCompany(
  tx: Database,
  userId: string,
  companyName: string,
): Promise<{ companyId: string; companyName: string }> {
  const [company] = await tx
    .insert(companies)
    .values({
      name: companyName,
      currency: "CHF",
      country: "CH",
      settings: {
        defaultVatRate: Number(DEFAULT_VAT_RATE),
        invoicePrefix: "INV",
        invoiceNextNumber: 1,
      },
    })
    .returning();

  await tx.insert(memberships).values({
    userId,
    companyId: company.id,
    role: "owner",
  });

  return { companyId: company.id, companyName: company.name };
}

/**
 * Create a new company for an existing user.
 * Creates company + owner membership + switches active company, all atomically.
 */
export async function createCompanyForUser(
  db: Database,
  userId: string,
  companyName: string,
): Promise<{ companyId: string; companyName: string }> {
  return await db.transaction(async (tx) => {
    const result = await createOwnedCompany(tx, userId, companyName);

    // Switch user's active company to the new one
    await tx
      .update(users)
      .set({ companyId: result.companyId })
      .where(eq(users.id, userId));

    return result;
  });
}

/**
 * Switch active company for a user. Updates users.companyId.
 * Guard: user must have a membership in the target company.
 */
export async function switchCompany(
  db: Database,
  userId: string,
  targetCompanyId: string,
): Promise<{ companyId: string; companyName: string; role: MembershipRole }> {
  const membership = await findMembership(db, userId, targetCompanyId);
  if (!membership) {
    throw new Error("You are not a member of this company");
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
    companyName: company?.name ?? "",
    role: membership.role,
  };
}
