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
import { Button } from "@/components/ui/button";

export async function LandingHeader() {
  const t = await getTranslations("landing");
  const tVerticals = await getTranslations("landing.verticals");
  const session = await auth();
  const isLoggedIn = !!session?.user;

  const navLinks = LANDING_NAV_LINKS.map((link) => ({
    href: link.href,
    label: t(link.labelKey),
  }));

  const verticals = VERTICALS.map((v) => ({
    id: v.id,
    href: v.href,
    title: tVerticals(`${v.id}.title`),
    description: tVerticals(`${v.id}.description`),
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
            verticals={verticals}
            solutionsLabel={t("navForWhom")}
            solutionsContextLinks={SOLUTIONS_CONTEXT_LINKS}
            wissenLabel={t("navKnowledge")}
            wissenItems={wissenItems}
            signInLabel={t("signIn")}
            demoLabel={t("requestDemo")}
            isLoggedIn={isLoggedIn}
            dashboardLabel={t("goToDashboard")}
            forWhomQuestionLabel={t("navForWhomQuestion")}
            featuredArticlesLabel={t("navFeaturedArticles")}
            allArticlesLabel={t("navAllArticles")}
            allArticlesShortLabel={t("navAllArticlesShort")}
            menuOpenLabel={t("menuOpen")}
            menuCloseLabel={t("menuClose")}
          />

          {/* Right CTAs (desktop only) */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isLoggedIn ? (
              <Button asChild>
                <Link href="/dashboard">
                  {t("goToDashboard")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("signIn")}
                </Link>
                <Button asChild>
                  <Link href="/contact">{t("requestDemo")}</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
