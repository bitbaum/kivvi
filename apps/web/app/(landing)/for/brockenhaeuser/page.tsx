import { ShoppingBag } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { SeeAlsoSection } from "@/components/landing/see-also-section";
import { PainList } from "@/components/landing/pain-list";
import { SolutionList } from "@/components/landing/solution-list";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { buildPageMeta } from "@/lib/config/site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.forBrockenhaeuser.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

export default async function ForBrockenhaeuserPage() {
  const t = await getTranslations("landing.forBrockenhaeuser");
  const painItems = t.raw("painItems") as string[];
  const solutionItems = t.raw("solutionItems") as string[];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <ShoppingBag className="h-4 w-4" />
          {t("hero.badge")}
        </div>
        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">{t("hero.title")}</h1>
        <p className="text-xl text-muted-foreground">{t("hero.description")}</p>
      </section>

      {/* Pain section */}
      <section className="mx-auto max-w-3xl py-8">
        <h2 className="mb-6 text-2xl font-bold">{t("painTitle")}</h2>
        <PainList items={painItems} />
      </section>

      {/* Solution section */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-6 text-2xl font-bold">{t("solutionTitle")}</h2>
        <SolutionList items={solutionItems} />
      </section>

      {/* Social economy context */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-3 text-xl font-bold">{t("context.title")}</h2>
          <p className="mb-4 text-muted-foreground">{t("context.description")}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <div className="text-xl font-bold text-primary">{t("context.stat1Value")}</div>
              <div className="text-sm text-muted-foreground mt-1">{t("context.stat1Label")}</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-xl font-bold text-primary">{t("context.stat2Value")}</div>
              <div className="text-sm text-muted-foreground mt-1">{t("context.stat2Label")}</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-xl font-bold text-primary">{t("context.stat3Value")}</div>
              <div className="text-sm text-muted-foreground mt-1">{t("context.stat3Label")}</div>
            </div>
          </div>
        </div>
      </section>

      <SeeAlsoSection current="brockenhaeuser" />

      <LandingCtaSection title={t("ctaTitle")} description={t("ctaDescription")} />
    </>
  );
}
