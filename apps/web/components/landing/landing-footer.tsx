import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Github } from "lucide-react";
import { KivviLogo } from "@/components/kivvi-logo";
import { LANDING_NAV_LINKS, VERTICAL_NAV_LINKS } from "@/lib/config/site";

export async function LandingFooter() {
  const t = await getTranslations("landing");

  return (
    <footer className="container mx-auto border-t px-4 py-8 mt-8">
      <div className="flex flex-col gap-6">
        {/* Top row: brand + nav */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <KivviLogo size={24} />
            <span className="font-semibold">Kivvi</span>
            <span className="text-sm text-muted-foreground">
              — {t("footerBuiltBy")} · {t("footerOpenSource")}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {LANDING_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom row: for-whom links + legal + github */}
        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {VERTICAL_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link
              href="/impressum"
              className="hover:text-foreground transition-colors"
            >
              {t("footerImpressum")}
            </Link>
            <Link
              href="/datenschutz"
              className="hover:text-foreground transition-colors"
            >
              {t("footerPrivacy")}
            </Link>
            <a
              href="https://github.com/g-but/kivvi"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
