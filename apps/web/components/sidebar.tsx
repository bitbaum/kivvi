"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useChatWidget } from "@/hooks/use-chat-widget";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
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
  X,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { KivviLogo } from "@/components/kivvi-logo";
import { CompanySwitcher } from "@/components/sidebar/company-switcher";
import { Button } from "@/components/ui/button";
import {
  NavLink,
  hasMinRole,
  isNavActive,
  type NavItem,
} from "@/components/sidebar/nav-link";

// Core navigation — ordered by daily workflow priority for secondhand/refurbished goods:
// Intake → Inventory → Sell → Support entities → Finance
// minRole defaults to "member"; viewers only see dashboard + intake + inventory
const primaryNavigation: NavItem[] = [
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

const secondaryNavigation: NavItem[] = [
  { nameKey: "settings", href: "/settings", icon: Settings, minRole: "admin" },
  { nameKey: "help", href: "/help", icon: HelpCircle, minRole: "viewer" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const chatWidget = useChatWidget();
  const badges = useNavBadges();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  const visiblePrimary = primaryNavigation.filter((item) =>
    hasMinRole(userRole, item.minRole ?? "member"),
  );
  const visibleSecondary = secondaryNavigation.filter((item) =>
    hasMinRole(userRole, item.minRole ?? "member"),
  );

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const sidebarContent = (
    <aside
      className="flex w-64 flex-shrink-0 flex-col border-r bg-card h-full"
      role="navigation"
      aria-label={tc("aria.mainNavigation")}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          aria-label={tc("aria.kivviHome")}
        >
          <KivviLogo size={32} />
          <span className="text-xl font-bold">Kivvi</span>
        </Link>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-auto lg:hidden"
            aria-label={tc("aria.closeMenu")}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Company selector */}
      <div className="border-b p-4">
        <CompanySwitcher tc={tc} />
      </div>

      {/* Main navigation */}
      <nav
        className="flex-1 space-y-1 overflow-y-auto p-4"
        aria-label={tc("aria.primaryNavigation")}
      >
        {/* AI Assistant */}
        <button
          onClick={() => {
            chatWidget.open();
            onClose?.();
          }}
          className={cn(
            "flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            chatWidget.isOpen
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {t("aiAssistant")}
        </button>

        <div className="my-3 border-t" role="separator" />

        {visiblePrimary.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            badges={badges}
            onClick={onClose}
            t={t}
          />
        ))}
      </nav>

      {/* Secondary navigation */}
      <nav className="border-t p-4" aria-label={tc("aria.secondaryNavigation")}>
        {visibleSecondary.map((item) => {
          const isActive = isNavActive(item, pathname);
          return (
            <Link
              key={item.nameKey}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {t(item.nameKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{sidebarContent}</div>

      {/* Mobile overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            className="fixed inset-y-0 left-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
          >
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
