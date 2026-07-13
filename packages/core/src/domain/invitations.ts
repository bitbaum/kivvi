import { z } from "zod";
import { eq, and } from "drizzle-orm";
import {
  invitations,
  memberships,
  companies,
  users,
  INVITABLE_ROLES,
} from "@kivvi/database";
import type { Database } from "@kivvi/database";
import type { MembershipRole, InvitationStatus } from "@kivvi/database";
import { randomBytes } from "crypto";
import { addMember } from "./memberships";
import { DomainError } from "../domain-error";
import {
  PERMISSION_PRESETS,
  normalizePermissionPreset,
  presetForRole,
  roleForPreset,
  type PermissionPreset,
} from "./permissions";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(INVITABLE_ROLES).default("member"),
  permissionPreset: z.enum(PERMISSION_PRESETS).optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface InvitationWithCompany {
  id: string;
  email: string;
  role: MembershipRole;
  permissionPreset: PermissionPreset;
  status: InvitationStatus;
  companyName: string;
  companyId: string;
  inviterName: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: MembershipRole;
  permissionPreset: PermissionPreset;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  inviterName: string | null;
  token: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INVITATION_EXPIRY_DAYS = 7;

// ============================================================================
// DOMAIN FUNCTIONS
// ============================================================================

/**
 * Create an invitation. Generates a secure token with 7-day expiry.
 * Guard: rejects if email already has an active invite or membership.
 */
export async function createInvitation(
  db: Database,
  companyId: string,
  invitedBy: string,
  email: string,
  role: MembershipRole = "member",
  permissionPreset: PermissionPreset = presetForRole(role),
) {
  const normalizedEmail = email.toLowerCase().trim();
  const effectivePreset = normalizePermissionPreset(permissionPreset, role);
  const effectiveRole = roleForPreset(effectivePreset);

  // Check for existing membership (user may already be a member)
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (existingUser) {
    const existingMembership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, existingUser.id),
        eq(memberships.companyId, companyId),
      ),
    });

    if (existingMembership) {
      throw new DomainError(
        "alreadyMember",
        undefined,
        "This user is already a member of this company",
      );
    }
  }

  // Check for existing pending invitation
  const existingInvite = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.email, normalizedEmail),
      eq(invitations.companyId, companyId),
      eq(invitations.status, "pending"),
    ),
  });

  if (existingInvite) {
    throw new DomainError(
      "invitationAlreadySent",
      undefined,
      "An invitation has already been sent to this email",
    );
  }

  // Generate secure token
  const token = randomBytes(32).toString("hex");

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const [invitation] = await db
    .insert(invitations)
    .values({
      companyId,
      email: normalizedEmail,
      role: effectiveRole,
      permissionPreset: effectivePreset,
      invitedBy,
      token,
      expiresAt,
    })
    .returning();

  return invitation;
}

/**
 * Accept an invitation. Creates membership, marks invite as accepted.
 * Sets the invited company as the user's active workspace.
 */
export async function acceptInvitation(
  db: Database,
  token: string,
  userId: string,
): Promise<{ companyId: string; companyName: string }> {
  const invitation = await db.query.invitations.findFirst({
    where: and(eq(invitations.token, token), eq(invitations.status, "pending")),
  });

  if (!invitation) {
    throw new DomainError(
      "invitationNotFound",
      undefined,
      "Invitation not found or already used",
    );
  }

  if (invitation.expiresAt < new Date()) {
    // Mark as expired
    await db
      .update(invitations)
      .set({ status: "expired" })
      .where(eq(invitations.id, invitation.id));
    throw new DomainError(
      "invitationExpired",
      undefined,
      "This invitation has expired",
    );
  }

  // Verify the accepting user's email matches the invitation
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address");
  }

  // Create membership + mark invitation accepted in one transaction
  return await db.transaction(async (tx) => {
    await addMember(
      tx as unknown as Database,
      invitation.companyId,
      userId,
      invitation.role,
      normalizePermissionPreset(invitation.permissionPreset, invitation.role),
    );

    await tx
      .update(invitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    await tx
      .update(users)
      .set({ companyId: invitation.companyId })
      .where(eq(users.id, userId));

    const company = await tx.query.companies.findFirst({
      where: eq(companies.id, invitation.companyId),
    });

    return {
      companyId: invitation.companyId,
      companyName: company?.name ?? "",
    };
  });
}

/**
 * Revoke a pending invitation.
 */
export async function revokeInvitation(
  db: Database,
  companyId: string,
  invitationId: string,
): Promise<void> {
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.id, invitationId),
      eq(invitations.companyId, companyId),
      eq(invitations.status, "pending"),
    ),
  });

  if (!invitation) {
    throw new Error("Invitation not found or already processed");
  }

  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(eq(invitations.id, invitationId));
}

/**
 * List pending invitations for a company.
 */
export async function getCompanyInvitations(
  db: Database,
  companyId: string,
): Promise<PendingInvitation[]> {
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
    })
    .from(invitations)
    .innerJoin(users, eq(invitations.invitedBy, users.id))
    .where(
      and(
        eq(invitations.companyId, companyId),
        eq(invitations.status, "pending"),
      ),
    );

  return rows.map((row) => ({
    ...row,
    permissionPreset: normalizePermissionPreset(row.permissionPreset, row.role),
  }));
}

/**
 * Get invitation by token (for the accept page).
 */
export async function getInvitationByToken(
  db: Database,
  token: string,
): Promise<InvitationWithCompany | null> {
  const rows = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      permissionPreset: invitations.permissionPreset,
      status: invitations.status,
      companyName: companies.name,
      companyId: invitations.companyId,
      inviterName: users.name,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .innerJoin(companies, eq(invitations.companyId, companies.id))
    .innerJoin(users, eq(invitations.invitedBy, users.id))
    .where(eq(invitations.token, token));

  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    permissionPreset: normalizePermissionPreset(row.permissionPreset, row.role),
  };
}
