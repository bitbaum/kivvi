import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { KivviLogo } from "@/components/kivvi-logo";
import { LandingNav } from "./landing-nav";
import {
  LANDING_NAV_LINKS,
  VERTICALS,
  SOLUTIONS_CONTEXT_LINKS,
  WISSEN_FEATURED_SLUGS,
} from "@/lib/config/site";
import { getAllArticles } from "@/lib/content/knowledge";
import { auth } from "@/lib/auth";

export async function LandingHeader() {
  const t = await getTranslations("landing");
  const session = await auth();
  const isLoggedIn = !!session?.user;

  const navLinks = LANDING_NAV_LINKS.map((link) => ({
    href: link.href,
    label: t(link.labelKey),
  }));

  // Resolve featured Wissen article slugs → metadata (title, tag) from .md frontmatter
  const allArticles = getAllArticles();
  const wissenItems = WISSEN_FEATURED_SLUGS.flatMap((slug) => {
    const article = allArticles.find((a) => a.slug === slug);
    return article
      ? [{ slug: article.slug, title: article.title, tag: article.tag }]
      : [];
  });

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <nav className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <KivviLogo size={28} />
            <span className="text-lg font-bold">Kivvi</span>
          </Link>

          {/* Nav */}
          <LandingNav
            links={navLinks}
            verticals={VERTICALS}
            solutionsLabel={t("navForWhom")}
            solutionsContextLinks={SOLUTIONS_CONTEXT_LINKS}
            wissenLabel={t("navKnowledge")}
            wissenItems={wissenItems}
            signInLabel={t("signIn")}
            demoLabel={t("requestDemo")}
            isLoggedIn={isLoggedIn}
            dashboardLabel={t("goToDashboard")}
          />

          {/* Right CTAs (desktop only) */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t("goToDashboard")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("signIn")}
                </Link>
                <Link
                  href="/contact"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {t("requestDemo")}
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
