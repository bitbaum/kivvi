/**
 * Dashboard sidebar navigation — single source of truth.
 *
 * Lives in lib/config (not in the Sidebar component file) so it can be
 * consumed by the command palette, breadcrumb resolver, mobile nav, and
 * future surfaces without duplicating the route table.
 *
 * Ordering reflects daily workflow priority for a secondhand /
 * refurbished-goods business: Intake → Inventory → Sell → support
 * entities → Finance. Reorder here and every navigation surface updates.
 */

import {
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Wallet,
  Users,
  Package,
  PackageOpen,
  Settings,
  HelpCircle,
  Warehouse,
  BarChart3,
  FolderKanban,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import type { NavItem } from "@/components/sidebar/nav-link";

export const PRIMARY_NAVIGATION: NavItem[] = [
  {
    nameKey: "home",
    href: "/dashboard",
    icon: LayoutDashboard,
    minRole: "viewer",
  },
  {
    nameKey: "intake",
    href: "/intake",
    icon: PackageOpen,
    minRole: "viewer",
    badgeKey: "repair",
    badgeVariant: "warning",
  },
  {
    nameKey: "inventory",
    href: "/inventory",
    icon: Warehouse,
    minRole: "viewer",
  },
  {
    nameKey: "sales",
    href: "/sales/invoices",
    icon: Receipt,
    activePrefixes: ["/sales", "/invoices"],
    badgeKey: "documents",
  },
  { nameKey: "pos", href: "/pos", icon: ShoppingBag },
  {
    nameKey: "repairs",
    href: "/repairs",
    icon: Wrench,
    badgeKey: "openRepairOrders",
  },
  { nameKey: "people", href: "/contacts", icon: Users },
  { nameKey: "catalog", href: "/products", icon: Package },
  {
    nameKey: "purchasing",
    href: "/purchasing/purchase-invoices",
    icon: ShoppingCart,
    activePrefixes: ["/purchasing"],
  },
  { nameKey: "projects", href: "/projects", icon: FolderKanban },
  {
    nameKey: "money",
    href: "/money",
    icon: Wallet,
    activePrefixes: ["/banking", "/accounting"],
    badgeKey: "money",
  },
  { nameKey: "reports", href: "/reports", icon: BarChart3 },
];

export const SECONDARY_NAVIGATION: NavItem[] = [
  { nameKey: "settings", href: "/settings", icon: Settings, minRole: "admin" },
  { nameKey: "help", href: "/help", icon: HelpCircle, minRole: "viewer" },
];
