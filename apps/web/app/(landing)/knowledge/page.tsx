import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllArticles } from "@/lib/content/knowledge";
import { Button } from "@/components/ui/button";
import { buildPageMeta } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Wissen für Kreislaufbetriebe — Kivvi Knowledge Base",
  description:
    "Praxiswissen zu Zustandsbewertung, Impact-Messung, Spendenquittungen und QR-Rechnungen — entwickelt aus dem Betrieb eines der grössten IT-Refurbisher der Schweiz.",
  ...buildPageMeta(
    "Wissen für Kreislaufbetriebe — Kivvi Knowledge Base",
    "Praxiswissen zu Zustandsbewertung, Impact-Messung, Spendenquittungen und QR-Rechnungen — entwickelt aus dem Betrieb eines der grössten IT-Refurbisher der Schweiz.",
  ),
};

// Tag → colour mapping. Add new tags here when needed.
const TAG_COLORS: Record<string, string> = {
  Einblicke: "bg-neutral/10 text-neutral",
  Betrieb: "bg-info/10 text-info",
  Compliance: "bg-warning/10 text-warning",
  Impact: "bg-success/10 text-success",
  Migration: "bg-tag-purple/10 text-tag-purple",
  Kundentypen: "bg-tag-rose/10 text-tag-rose",
};

export default async function KnowledgePage() {
  const t = await getTranslations("landing.knowledge");
  const articles = getAllArticles();

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="text-xl text-muted-foreground">{t("hero.description")}</p>
      </section>

      {/* Articles */}
      <section className="mx-auto max-w-4xl py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) =>
            article.published ? (
              <Link
                key={article.slug}
                href={`/knowledge/${article.slug}`}
                className="group flex flex-col rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${TAG_COLORS[article.tag] ?? ""}`}
                  >
                    {article.tag}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {article.readTime}
                  </span>
                </div>
                <h2 className="mb-2 font-semibold leading-snug group-hover:text-primary transition-colors">
                  {article.title}
                </h2>
                <p className="flex-1 text-sm text-muted-foreground leading-relaxed">
                  {article.excerpt}
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                  {t("card.read")} <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ) : (
              <div
                key={article.slug}
                className="flex flex-col rounded-xl border bg-card/50 p-6 opacity-70"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${TAG_COLORS[article.tag] ?? ""}`}
                  >
                    {article.tag}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {article.readTime}
                  </span>
                </div>
                <h2 className="mb-2 font-semibold leading-snug">
                  {article.title}
                </h2>
                <p className="flex-1 text-sm text-muted-foreground leading-relaxed">
                  {article.excerpt}
                </p>
                <div className="mt-4 text-xs text-muted-foreground">
                  {t("card.comingSoon")}
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Cross-links */}
      <section className="mx-auto max-w-4xl py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/circular-economy"
            className="group rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-xs text-muted-foreground mb-1">
              {t("crossLinks.circularEconomy.label")}
            </p>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {t("crossLinks.circularEconomy.title")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("crossLinks.circularEconomy.description")}
            </p>
          </Link>
          <Link
            href="/why-kivvi"
            className="group rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-xs text-muted-foreground mb-1">
              {t("crossLinks.whyKivvi.label")}
            </p>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {t("crossLinks.whyKivvi.title")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("crossLinks.whyKivvi.description")}
            </p>
          </Link>
          <Link
            href="/how-it-works"
            className="group rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-xs text-muted-foreground mb-1">
              {t("crossLinks.howItWorks.label")}
            </p>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {t("crossLinks.howItWorks.title")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("crossLinks.howItWorks.description")}
            </p>
          </Link>
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-2xl py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">{t("askQuestion.title")}</h2>
        <p className="mb-8 text-muted-foreground">
          {t("askQuestion.description")}
        </p>
        <Button asChild size="lg">
          <Link href="/contact">
            {t("askQuestion.cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </>
  );
}
