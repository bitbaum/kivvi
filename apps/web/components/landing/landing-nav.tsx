"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  Recycle,
  ArrowRight,
  LayoutDashboard,
  BookOpen,
} from "lucide-react";
import { VERTICAL_ICONS } from "./vertical-icons";
import { Button } from "@/components/ui/button";

interface NavLink {
  href: string;
  label: string;
}

interface Vertical {
  id: string;
  href: string;
  title: string;
  description: string;
}

interface SolutionsContextLink {
  href: string;
  label: string;
}

interface FeaturedArticle {
  slug: string;
  title: string;
  tag: string;
}

type DropdownId = "solutions" | "wissen";

export function LandingNav({
  links,
  verticals,
  solutionsLabel,
  solutionsContextLinks,
  wissenLabel,
  wissenItems,
  signInLabel,
  demoLabel,
  isLoggedIn = false,
  dashboardLabel = "Dashboard",
}: {
  links: NavLink[];
  verticals: readonly Vertical[];
  solutionsLabel: string;
  solutionsContextLinks: readonly SolutionsContextLink[];
  wissenLabel: string;
  wissenItems: FeaturedArticle[];
  signInLabel: string;
  demoLabel: string;
  isLoggedIn?: boolean;
  dashboardLabel?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

  function toggle(id: DropdownId) {
    setOpenDropdown((prev) => (prev === id ? null : id));
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isVerticalActive = verticals.some((v) => isActive(v.href));
  const isWissenActive =
    isActive("/knowledge") || isActive("/circular-economy");

  return (
    <>
      {/* ── Desktop nav ────────────────────────────────── */}
      <div ref={navRef} className="hidden md:flex items-center gap-1">
        {/* Solutions dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            onClick={() => toggle("solutions")}
            aria-expanded={openDropdown === "solutions"}
            aria-haspopup="true"
            className={`gap-1 text-sm font-medium ${
              openDropdown === "solutions" || isVerticalActive
                ? "text-foreground bg-muted"
                : "text-muted-foreground"
            }`}
          >
            {solutionsLabel}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === "solutions" ? "rotate-180" : ""}`}
            />
          </Button>

          {openDropdown === "solutions" && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-[520px] rounded-xl border bg-background shadow-lg ring-1 ring-black/5 dark:ring-white/10">
              <div className="p-4">
                <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Für wen ist Kivvi?
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {verticals.map((v) => {
                    const Icon = VERTICAL_ICONS[v.id];
                    return (
                      <Link
                        key={v.href}
                        href={v.href}
                        onClick={() => setOpenDropdown(null)}
                        className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted transition-colors"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {Icon && <Icon className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium leading-snug">
                            {v.title}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground leading-snug">
                            {v.description}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-3 border-t pt-3 flex flex-wrap gap-1">
                  {solutionsContextLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {link.href === "/circular-economy" ? (
                        <Recycle className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5" />
                      )}
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wissen dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            onClick={() => toggle("wissen")}
            aria-expanded={openDropdown === "wissen"}
            aria-haspopup="true"
            className={`gap-1 text-sm font-medium ${
              openDropdown === "wissen" || isWissenActive
                ? "text-foreground bg-muted"
                : "text-muted-foreground"
            }`}
          >
            {wissenLabel}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === "wissen" ? "rotate-180" : ""}`}
            />
          </Button>

          {openDropdown === "wissen" && wissenItems.length > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-[400px] rounded-xl border bg-background shadow-lg ring-1 ring-black/5 dark:ring-white/10">
              <div className="p-4">
                <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ausgewählte Artikel
                </p>
                <div className="space-y-0.5">
                  {wissenItems.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/knowledge/${article.slug}`}
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted transition-colors group"
                    >
                      <span className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {article.title}
                      </span>
                      <span className="ml-3 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {article.tag}
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="mt-3 border-t pt-3">
                  <Link
                    href="/knowledge"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Alle Artikel ansehen
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Flat links */}
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive(link.href)
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* ── Mobile hamburger ───────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileOpen((p) => !p)}
        aria-label={mobileOpen ? "Menü schliessen" : "Menü öffnen"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* ── Mobile panel ───────────────────────────────── */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full z-50 border-b bg-background shadow-lg md:hidden">
          <nav className="container mx-auto flex flex-col px-4 py-4 gap-0.5 max-h-[80dvh] overflow-y-auto">
            {/* Solutions */}
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Für wen
            </p>
            {verticals.map((v) => {
              const Icon = VERTICAL_ICONS[v.id];
              return (
                <Link
                  key={v.href}
                  href={v.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {v.title}
                </Link>
              );
            })}

            <div className="my-1.5 border-t" />

            {solutionsContextLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {link.href === "/circular-economy" ? (
                  <Recycle className="h-4 w-4 shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0" />
                )}
                {link.label}
              </Link>
            ))}

            <div className="my-1.5 border-t" />

            {/* Wissen */}
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {wissenLabel}
            </p>
            {wissenItems.map((article) => (
              <Link
                key={article.slug}
                href={`/knowledge/${article.slug}`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <span className="line-clamp-1">{article.title}</span>
                <span className="ml-3 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {article.tag}
                </span>
              </Link>
            ))}
            <Link
              href="/knowledge"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              Alle Artikel
            </Link>

            <div className="my-1.5 border-t" />

            {/* Flat links */}
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-2 border-t pt-3 flex flex-col gap-2">
              {isLoggedIn ? (
                <Button asChild className="w-full">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" />
                    {dashboardLabel}
                  </Link>
                </Button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {signInLabel}
                  </Link>
                  <Button asChild className="w-full">
                    <Link href="/contact" onClick={() => setMobileOpen(false)}>
                      {demoLabel}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
