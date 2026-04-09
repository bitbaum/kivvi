import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { KivviLogo } from "@/components/kivvi-logo";
import { LandingNav } from "./landing-nav";
import { LANDING_NAV_LINKS } from "@/lib/config/site";

export async function LandingHeader() {
  const t = await getTranslations("landing");

  const navLinks = LANDING_NAV_LINKS.map((link) => ({
    href: link.href,
    label: t(link.labelKey),
  }));

  return (
    <header className="relative container mx-auto px-4 py-6">
      <nav className="flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <KivviLogo size={32} />
          <span className="text-xl font-bold">Kivvi</span>
        </Link>

        {/* Nav (desktop inline + mobile hamburger) */}
        <LandingNav
          links={navLinks}
          signInLabel={t("signIn")}
          demoLabel={t("requestDemo")}
        />

        {/* Right actions (desktop only) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("signIn")}
          </Link>
          <a
            href="/#contact"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t("requestDemo")}
          </a>
        </div>
      </nav>
    </header>
  );
}
