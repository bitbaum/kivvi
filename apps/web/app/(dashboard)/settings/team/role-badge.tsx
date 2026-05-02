"use client";

import type { MembershipRole } from "@kivvi/database";

export const ROLE_COLORS: Record<MembershipRole, string> = {
  owner: "bg-warning/10 text-warning",
  admin: "bg-info/10 text-info",
  member: "bg-neutral/10 text-neutral",
  viewer: "bg-neutral/10 text-neutral",
};

export function RoleBadge({
  role,
  label,
}: {
  role: MembershipRole;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}
    >
      {label}
    </span>
  );
}
