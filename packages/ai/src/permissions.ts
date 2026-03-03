import type { Permission } from './types';

/**
 * Role-based permission mapping for AI tools.
 * Each role defines which AI tool permissions are granted.
 *
 * Roles:
 * - admin: Full access to all AI tools
 * - member: Read access + document write (standard user)
 * - viewer: Read-only access (e.g., accountant viewing reports)
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'invoice:read',
    'invoice:write',
    'invoice:delete',
    'contact:read',
    'contact:write',
    'product:read',
    'product:write',
    'banking:read',
    'banking:write',
    'accounting:read',
    'accounting:write',
    'project:read',
    'project:write',
    'settings:read',
    'settings:write',
  ],
  member: [
    'invoice:read',
    'invoice:write',
    'contact:read',
    'contact:write',
    'product:read',
    'banking:read',
    'accounting:read',
    'project:read',
    'project:write',
  ],
  viewer: [
    'invoice:read',
    'contact:read',
    'product:read',
    'banking:read',
    'accounting:read',
    'project:read',
  ],
};

/**
 * Get AI tool permissions for a user role.
 * Unknown roles default to 'viewer' (read-only) for safety.
 */
export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
}
