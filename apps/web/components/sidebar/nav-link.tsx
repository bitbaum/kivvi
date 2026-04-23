"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavBadges } from "@/hooks/use-nav-badges";

export type UserRole = "owner" | "admin" | "member" | "viewer";

export const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function hasMinRole(
  userRole: string | undefined,
  minRole: UserRole,
): boolean {
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
}

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href || pathname.startsWith(item.href + "/"))
    return true;
  if (item.activePrefixes) {
    return item.activePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    );
  }
  return false;
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
  badges: NavBadges;
  onClick?: () => void;
  t: (key: string) => string;
}) {
  const isActive = isNavActive(item, pathname);
  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
  const isWarning = item.badgeVariant === "warning";
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <div className="relative">
        <item.icon className="h-4 w-4" aria-hidden="true" />
        {badgeCount > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 h-2 w-2 rounded-full",
              isWarning ? "bg-warning/70" : "bg-destructive/50",
            )}
            aria-label={`${badgeCount}`}
          />
        )}
      </div>
      <span className="flex-1">{t(item.nameKey)}</span>
      {badgeCount > 0 && (
        <span
          className={cn(
            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium",
            isActive
              ? "bg-primary-foreground/20 text-primary-foreground"
              : isWarning
                ? "bg-warning/10 text-warning"
                : "bg-destructive/10 text-destructive",
          )}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}
