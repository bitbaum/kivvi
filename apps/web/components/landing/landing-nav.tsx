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
} from "lucide-react";
import { VERTICAL_ICONS } from "./vertical-icons";

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

export function LandingNav({
  links,
  verticals,
  solutionsLabel,
  signInLabel,
  demoLabel,
  isLoggedIn = false,
  dashboardLabel = "Dashboard",
}: {
  links: NavLink[];
  verticals: readonly Vertical[];
  solutionsLabel: string;
  signInLabel: string;
  demoLabel: string;
  isLoggedIn?: boolean;
  dashboardLabel?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setSolutionsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
    setSolutionsOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSolutionsOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isVerticalActive = verticals.some((v) => isActive(v.href));

  return (
    <>
      {/* ── Desktop nav ────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-1">
        {/* Solutions dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setSolutionsOpen((p) => !p)}
            aria-expanded={solutionsOpen}
            aria-haspopup="true"
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              solutionsOpen || isVerticalActive
                ? "text-foreground bg-muted"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {solutionsLabel}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${solutionsOpen ? "rotate-180" : ""}`}
            />
          </button>

          {solutionsOpen && (
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
                        onClick={() => setSolutionsOpen(false)}
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
                  <Link
                    href="/circular-economy"
                    onClick={() => setSolutionsOpen(false)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Recycle className="h-3.5 w-3.5" />
                    Kreislaufwirtschaft verstehen
                  </Link>
                  <Link
                    href="/why-kivvi"
                    onClick={() => setSolutionsOpen(false)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Warum Kivvi
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
      <button
        className="md:hidden rounded-lg p-2 hover:bg-muted transition-colors"
        onClick={() => setMobileOpen((p) => !p)}
        aria-label={mobileOpen ? "Menü schliessen" : "Menü öffnen"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* ── Mobile panel ───────────────────────────────── */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full z-50 border-b bg-background shadow-lg md:hidden">
          <nav className="container mx-auto flex flex-col px-4 py-4 gap-0.5">
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

            <Link
              href="/circular-economy"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Recycle className="h-4 w-4 shrink-0" />
              Kreislaufwirtschaft
            </Link>
            <Link
              href="/why-kivvi"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowRight className="h-4 w-4 shrink-0" />
              Warum Kivvi
            </Link>

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
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {dashboardLabel}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {signInLabel}
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {demoLabel}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
