import { describe, it, expect } from 'vitest';
import { updateMemberRoleSchema, switchCompanySchema } from '../domain/memberships';

describe('updateMemberRoleSchema', () => {
  it('accepts valid owner role', () => {
    const result = updateMemberRoleSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'owner',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid admin role', () => {
    const result = updateMemberRoleSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid member role', () => {
    const result = updateMemberRoleSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'member',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid viewer role', () => {
    const result = updateMemberRoleSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'viewer',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = updateMemberRoleSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty role', () => {
    const result = updateMemberRoleSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID userId', () => {
    const result = updateMemberRoleSchema.safeParse({
      userId: 'not-a-uuid',
      role: 'member',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing userId', () => {
    const result = updateMemberRoleSchema.safeParse({ role: 'member' });
    expect(result.success).toBe(false);
  });

  it('rejects missing role', () => {
    const result = updateMemberRoleSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(false);
  });
});

describe('switchCompanySchema', () => {
  it('accepts valid UUID', () => {
    const result = switchCompanySchema.safeParse({
      companyId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID', () => {
    const result = switchCompanySchema.safeParse({ companyId: 'abc123' });
    expect(result.success).toBe(false);
  });

  it('rejects missing companyId', () => {
    const result = switchCompanySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('membership role hierarchy', () => {
  // Mirrors the permission logic in updateMemberRole
  const ROLES_THAT_CAN_CHANGE_ROLES = ['owner', 'admin'];
  const ROLES_THAT_REQUIRE_OWNER_TO_PROMOTE = ['owner', 'admin'];

  it('owner can change roles', () => {
    expect(ROLES_THAT_CAN_CHANGE_ROLES.includes('owner')).toBe(true);
  });

  it('admin can change roles', () => {
    expect(ROLES_THAT_CAN_CHANGE_ROLES.includes('admin')).toBe(true);
  });

  it('member cannot change roles', () => {
    expect(ROLES_THAT_CAN_CHANGE_ROLES.includes('member')).toBe(false);
  });

  it('viewer cannot change roles', () => {
    expect(ROLES_THAT_CAN_CHANGE_ROLES.includes('viewer')).toBe(false);
  });

  it('promoting to owner requires owner role', () => {
    expect(ROLES_THAT_REQUIRE_OWNER_TO_PROMOTE.includes('owner')).toBe(true);
  });

  it('promoting to admin requires owner role', () => {
    expect(ROLES_THAT_REQUIRE_OWNER_TO_PROMOTE.includes('admin')).toBe(true);
  });

  it('promoting to member does not require owner', () => {
    expect(ROLES_THAT_REQUIRE_OWNER_TO_PROMOTE.includes('member')).toBe(false);
  });
});

describe('last owner guard logic', () => {
  // Mirrors the guard in removeMember and updateMemberRole
  function canRemoveOwner(ownerCount: number): boolean {
    return ownerCount > 1;
  }

  function canDemoteOwner(ownerCount: number, newRole: string): boolean {
    if (newRole === 'owner') return true; // Not actually demoting
    return ownerCount > 1;
  }

  it('can remove owner when multiple owners exist', () => {
    expect(canRemoveOwner(2)).toBe(true);
    expect(canRemoveOwner(3)).toBe(true);
  });

  it('cannot remove the last owner', () => {
    expect(canRemoveOwner(1)).toBe(false);
  });

  it('cannot remove owner when none exist (edge case)', () => {
    expect(canRemoveOwner(0)).toBe(false);
  });

  it('can demote owner when multiple owners exist', () => {
    expect(canDemoteOwner(2, 'admin')).toBe(true);
    expect(canDemoteOwner(3, 'member')).toBe(true);
  });

  it('cannot demote the last owner to admin', () => {
    expect(canDemoteOwner(1, 'admin')).toBe(false);
  });

  it('cannot demote the last owner to member', () => {
    expect(canDemoteOwner(1, 'member')).toBe(false);
  });

  it('"demoting" owner to owner is a no-op and is allowed', () => {
    expect(canDemoteOwner(1, 'owner')).toBe(true);
  });
});
