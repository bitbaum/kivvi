import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Github } from "lucide-react";
import { KivviLogo } from "@/components/kivvi-logo";
import { VERTICALS } from "@/lib/config/site";

export async function LandingFooter() {
  const t = await getTranslations("landing");

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        {/* 4-column grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <KivviLogo size={24} />
              <span className="font-semibold">Kivvi</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Das ERP für die Kreislaufwirtschaft. Open Source, Swiss-native.
            </p>
            <a
              href="https://github.com/g-but/kivvi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>

          {/* Col 2: Produkt */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Produkt
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/how-it-works"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("navHowItWorks")}
                </Link>
              </li>
              <li>
                <Link
                  href="/why-kivvi"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("navWhyKivvi")}
                </Link>
              </li>
              <li>
                <Link
                  href="/circular-economy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("navCircularEconomy")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Für wen */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Für wen
            </p>
            <ul className="space-y-2.5 text-sm">
              {VERTICALS.map((v) => (
                <li key={v.href}>
                  <Link
                    href={v.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {v.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Unternehmen */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unternehmen
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("navAbout")}
                </Link>
              </li>
              <li>
                <Link
                  href="/knowledge"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("navKnowledge")}
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("navFaq")}
                </Link>
              </li>
              <li>
                <Link
                  href="/impressum"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footerImpressum")}
                </Link>
              </li>
              <li>
                <Link
                  href="/datenschutz"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footerPrivacy")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-10 border-t pt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} Kivvi · {t("footerBuiltBy")} · MIT
            License
          </span>
          <span>{t("footerOpenSource")}</span>
        </div>
      </div>
    </footer>
  );
}
