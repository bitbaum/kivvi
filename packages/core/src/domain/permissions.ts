import {
  PERMISSION_PRESET_VALUES,
  type MembershipRoleValue,
  type PermissionPresetValue,
} from "@kivvi/database/src/enums";

export type PermissionPreset = PermissionPresetValue;

export type Capability =
  | "team.manage"
  | "billing.manage"
  | "settings.manage"
  | "finance.manage"
  | "sales.manage"
  | "intake.manage"
  | "inventory.manage"
  | "repair.manage"
  | "reports.export"
  | "read";

export const PERMISSION_PRESETS = PERMISSION_PRESET_VALUES;

export const PRESET_CAPABILITIES: Record<PermissionPreset, Capability[]> = {
  owner: [
    "team.manage",
    "billing.manage",
    "settings.manage",
    "finance.manage",
    "sales.manage",
    "intake.manage",
    "inventory.manage",
    "repair.manage",
    "reports.export",
    "read",
  ],
  admin: [
    "team.manage",
    "settings.manage",
    "finance.manage",
    "sales.manage",
    "intake.manage",
    "inventory.manage",
    "repair.manage",
    "reports.export",
    "read",
  ],
  finance: ["finance.manage", "reports.export", "read"],
  sales: ["sales.manage", "intake.manage", "reports.export", "read"],
  intake: ["intake.manage", "inventory.manage", "read"],
  repair: ["repair.manage", "intake.manage", "inventory.manage", "read"],
  inventory: ["inventory.manage", "intake.manage", "read"],
  viewer: ["read"],
};

export function isPermissionPreset(value: string): value is PermissionPreset {
  return (PERMISSION_PRESET_VALUES as readonly string[]).includes(value);
}

export function presetForRole(role: MembershipRoleValue): PermissionPreset {
  if (role === "owner" || role === "admin" || role === "viewer") return role;
  return "sales";
}

export function roleForPreset(preset: PermissionPreset): MembershipRoleValue {
  if (preset === "owner" || preset === "admin" || preset === "viewer") {
    return preset;
  }
  return "member";
}

export function normalizePermissionPreset(
  value: string | null | undefined,
  role: MembershipRoleValue = "member",
): PermissionPreset {
  return value && isPermissionPreset(value) ? value : presetForRole(role);
}

export function hasCapability(preset: PermissionPreset, capability: Capability): boolean {
  return PRESET_CAPABILITIES[preset].includes(capability);
}
