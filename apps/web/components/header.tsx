"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Search,
  Menu,
  LogOut,
  Settings,
  User,
  Globe,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { getUserAvatarAction } from "@/app/actions/settings";
import { RecentItemsDropdown } from "./recent-items-dropdown";
import { ThemeToggle } from "./theme-toggle";
import { useNavBadges } from "@/hooks/use-nav-badges";
import type { Locale } from "@/i18n/request";
import { LOCALE_CONFIG } from "@/lib/config/locales";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick?: () => void;
  onCommandPalette?: () => void;
}

export function Header({ onMenuClick, onCommandPalette }: HeaderProps) {
  const { data: session, status } = useSession();
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const badges = useNavBadges();
  const alertCount = badges.documents + badges.money;

  // Fetch avatar separately (too large for JWT cookie)
  const fetchAvatar = useCallback(async () => {
    if (status === "authenticated") {
      const avatar = await getUserAvatarAction();
      setAvatarBase64(avatar);
    }
  }, [status]);

  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);
  const menuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const isMac = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad/.test(navigator.userAgent),
    [],
  );

  function switchLocale(newLocale: Locale) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 60 * 60}`;
    setShowLangMenu(false);
    router.refresh();
  }

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowUserMenu(false);
        setShowLangMenu(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <header
      className="flex h-16 items-center justify-between border-b bg-card px-6"
      role="banner"
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-muted lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("aria.openNavigation")}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile search button — visible only below lg breakpoint */}
      <button
        type="button"
        onClick={onCommandPalette}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-muted lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("aria.openCommandPalette")}
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Search — opens command palette (desktop) */}
      <div className="hidden flex-1 lg:block lg:max-w-md">
        <button
          type="button"
          onClick={onCommandPalette}
          className="flex w-full items-center gap-2 rounded-lg border bg-background py-2 pl-10 pr-20 text-sm text-muted-foreground hover:bg-muted/50 transition-colors relative text-left"
          role="search"
          aria-label={t("aria.openCommandPalette")}
        >
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          {t("searchOrAskAI")}
          <kbd
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground pointer-events-none"
            aria-hidden="true"
          >
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Recent items */}
        <RecentItemsDropdown />

        {/* Language switcher */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Current language: ${LOCALE_CONFIG[locale].native}`}
            aria-expanded={showLangMenu}
            aria-haspopup="true"
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            {LOCALE_CONFIG[locale].short}
          </button>
          {showLangMenu && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-36 rounded-lg border bg-card p-1 shadow-md"
              role="menu"
              aria-label={t("aria.languageOptions")}
            >
              {(
                Object.entries(LOCALE_CONFIG) as [
                  Locale,
                  { short: string; native: string },
                ][]
              ).map(([loc, cfg]) => (
                <button
                  key={loc}
                  onClick={() => switchLocale(loc)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted",
                    locale === loc && "font-medium text-primary",
                  )}
                  role="menuitem"
                >
                  {cfg.native}
                  {locale === loc && (
                    <span className="ml-auto text-primary" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle — light / system / dark */}
        <ThemeToggle />

        {/* Notification bell — shows count of overdue + unreconciled items */}
        <Link
          href="/sales/invoices?status=overdue"
          className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={t("aria.notifications")}
          title={
            alertCount > 0
              ? `${badges.documents} ${t("overdue")}, ${badges.money} ${t("unreconciled")}`
              : t("aria.notifications")
          }
        >
          <Bell className="h-5 w-5" />
          {alertCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive/50 px-1 text-[10px] font-bold text-white">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`User menu: ${session?.user?.name || "User"}`}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            {status === "loading" ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ) : avatarBase64 ? (
              /* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, next/image optimization not applicable */
              <img
                src={avatarBase64}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full brand-gradient text-sm font-medium text-white">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
            )}
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border bg-card p-1 shadow-md"
              role="menu"
              aria-label={t("aria.userMenu")}
            >
              <div className="border-b px-3 py-2">
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {session?.user?.email}
                </p>
                {session?.user?.companyName && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {session.user.companyName}
                  </p>
                )}
              </div>

              <div className="py-1">
                {/* Profile - NOW FUNCTIONAL */}
                <Link
                  href="/settings/profile"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  role="menuitem"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  {t("profile")}
                </Link>
                {/* Settings - NOW FUNCTIONAL */}
                <Link
                  href="/settings"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  role="menuitem"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  {t("settings")}
                </Link>
              </div>

              <div className="border-t py-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t("signOut")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
