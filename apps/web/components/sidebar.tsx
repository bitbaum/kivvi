"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useChatWidget } from "@/hooks/use-chat-widget";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { useEffect } from "react";
import { MessageSquare, X } from "lucide-react";
import { KivviLogo } from "@/components/kivvi-logo";
import { CompanySwitcher } from "@/components/sidebar/company-switcher";
import { Button } from "@/components/ui/button";
import { NavLink, hasMinRole, filterNavByModules } from "@/components/sidebar/nav-link";
import { PRIMARY_NAVIGATION, SECONDARY_NAVIGATION } from "@/lib/config/navigation";

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
  const enabledModules = session?.user?.enabledModules;

  const visiblePrimary = filterNavByModules(PRIMARY_NAVIGATION, enabledModules).filter((item) =>
    hasMinRole(userRole, item.minRole ?? "member"),
  );
  const visibleSecondary = SECONDARY_NAVIGATION.filter((item) =>
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
          className={cn("ui-nav-item", chatWidget.isOpen && "ui-nav-item-active")}
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
        {visibleSecondary.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} t={t} />
        ))}
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
            aria-label={tc("aria.mainNavigation")}
          >
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
