"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useChatWidget } from "@/hooks/use-chat-widget";
import { useNavBadges, type NavBadges } from "@/hooks/use-nav-badges";
import { useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
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
} from "lucide-react";
import { KivviLogo } from "@/components/kivvi-logo";
import { CompanySwitcher } from "@/components/sidebar/company-switcher";

interface NavItem {
  nameKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  activePrefixes?: string[];
  badgeKey?: keyof NavBadges;
}

// Core navigation — flat, 8 items
const primaryNavigation: NavItem[] = [
  { nameKey: "home", href: "/dashboard", icon: LayoutDashboard },
  { nameKey: "people", href: "/contacts", icon: Users },
  { nameKey: "catalog", href: "/products", icon: Package },
  {
    nameKey: "documents",
    href: "/documents",
    icon: FileText,
    activePrefixes: ["/sales", "/purchasing"],
    badgeKey: "documents",
  },
  {
    nameKey: "money",
    href: "/money",
    icon: Wallet,
    activePrefixes: ["/banking", "/accounting"],
    badgeKey: "money",
  },
  { nameKey: "intake", href: "/intake", icon: PackageOpen },
  { nameKey: "inventory", href: "/inventory", icon: Warehouse },
  { nameKey: "projects", href: "/projects", icon: FolderKanban },
  { nameKey: "reports", href: "/reports", icon: BarChart3 },
];

const secondaryNavigation: NavItem[] = [
  { nameKey: "settings", href: "/settings", icon: Settings },
  { nameKey: "help", href: "/help", icon: HelpCircle },
];

function isNavActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href || pathname.startsWith(item.href + "/"))
    return true;
  if (item.activePrefixes) {
    return item.activePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    );
  }
  return false;
}

function NavLink({
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
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500"
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
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          )}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}

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
          <button
            onClick={onClose}
            className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-muted lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={tc("aria.closeMenu")}
          >
            <X className="h-5 w-5" />
          </button>
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

        {primaryNavigation.map((item) => (
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
        {secondaryNavigation.map((item) => {
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
