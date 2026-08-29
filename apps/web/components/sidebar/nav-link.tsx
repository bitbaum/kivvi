"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavBadges } from "@/hooks/use-nav-badges";
import type { MembershipRole } from "@kivvi/database";
import { isModuleEnabled, type ModuleKey } from "@kivvi/core/src/config/modules";

export type UserRole = MembershipRole;

export const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function hasMinRole(userRole: string | undefined, minRole: UserRole): boolean {
  const rank = ROLE_RANK[userRole as UserRole] ?? 0;
  return rank >= ROLE_RANK[minRole];
}

export interface NavItem {
  nameKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  activePrefixes?: string[];
  badgeKey?: keyof NavBadges;
  /** Badge color variant. Defaults to "destructive". */
  badgeVariant?: "destructive" | "warning";
  /** Minimum role required to see this item. Defaults to "member". */
  minRole?: UserRole;
  /**
   * Optional toggleable module this item belongs to. When set, the item is
   * only shown if the module is enabled for the current company. Core items
   * leave this undefined and are always shown.
   */
  moduleKey?: ModuleKey;
}

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  if (item.activePrefixes) {
    return item.activePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    );
  }
  return false;
}

/**
 * Filter nav items by the company's enabled modules. Items without a
 * `moduleKey` (core items) always pass. `enabledModules` of `null`/`undefined`
 * means all modules enabled (legacy default). Pure — safe to unit test.
 */
export function filterNavByModules<T extends { moduleKey?: ModuleKey }>(
  items: T[],
  enabledModules: readonly string[] | null | undefined,
): T[] {
  const list = enabledModules ?? undefined;
  return items.filter((item) => !item.moduleKey || isModuleEnabled(list, item.moduleKey));
}

export function NavLink({
  item,
  pathname,
  badges,
  onClick,
  t,
}: {
  item: NavItem;
  pathname: string;
  /** Optional — only required for items that declare a `badgeKey`. */
  badges?: NavBadges;
  onClick?: () => void;
  t: (key: string) => string;
}) {
  const isActive = isNavActive(item, pathname);
  const badgeCount = item.badgeKey && badges ? badges[item.badgeKey] : 0;
  const isWarning = item.badgeVariant === "warning";
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn("ui-nav-item", isActive && "ui-nav-item-active")}
      aria-current={isActive ? "page" : undefined}
    >
      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{t(item.nameKey)}</span>
      {badgeCount > 0 && (
        <span
          className={cn(
            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
            isWarning ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive",
          )}
          aria-label={`${badgeCount}`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}
