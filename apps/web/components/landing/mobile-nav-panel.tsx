"use client";

import Link from "next/link";
import { Recycle, ArrowRight, LayoutDashboard, BookOpen } from "lucide-react";
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

interface MobileNavPanelProps {
  verticals: readonly Vertical[];
  solutionsContextLinks: readonly SolutionsContextLink[];
  wissenLabel: string;
  wissenItems: FeaturedArticle[];
  links: NavLink[];
  isLoggedIn: boolean;
  dashboardLabel: string;
  signInLabel: string;
  demoLabel: string;
  onClose: () => void;
}

export function MobileNavPanel({
  verticals,
  solutionsContextLinks,
  wissenLabel,
  wissenItems,
  links,
  isLoggedIn,
  dashboardLabel,
  signInLabel,
  demoLabel,
  onClose,
}: MobileNavPanelProps) {
  return (
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
              onClick={onClose}
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
            onClick={onClose}
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
            onClick={onClose}
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
          onClick={onClose}
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
            onClick={onClose}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {link.label}
          </Link>
        ))}

        <div className="mt-2 border-t pt-3 flex flex-col gap-2">
          {isLoggedIn ? (
            <Button asChild className="w-full">
              <Link href="/dashboard" onClick={onClose}>
                <LayoutDashboard className="h-4 w-4" />
                {dashboardLabel}
              </Link>
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                onClick={onClose}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {signInLabel}
              </Link>
              <Button asChild className="w-full">
                <Link href="/contact" onClick={onClose}>
                  {demoLabel}
                </Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
